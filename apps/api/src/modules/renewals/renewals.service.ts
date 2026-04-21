import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between } from 'typeorm';
import {
  NegotiationNoteEntity,
  RenewalRecordEntity,
  RenewalStage,
} from './entities/renewal-record.entity';
import { ContractEntity } from '@/modules/contracts/entities/contract.entity';
import { CustomerEntity } from '@/modules/customers/entities/customer.entity';
import { CustomersService } from '@/modules/customers/customers.service';
import { LlmService } from '@/modules/llm/llm.service';

const WARNING_WINDOW_DAYS = 30;

@Injectable()
export class RenewalsService {
  constructor(
    @InjectRepository(RenewalRecordEntity)
    private readonly renewals: Repository<RenewalRecordEntity>,
    @InjectRepository(NegotiationNoteEntity)
    private readonly notes: Repository<NegotiationNoteEntity>,
    @InjectRepository(ContractEntity)
    private readonly contracts: Repository<ContractEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customers: Repository<CustomerEntity>,
    private readonly customersSvc: CustomersService,
    private readonly llm: LlmService,
  ) {}

  /**
   * 扫描 contract.expires_at 在 30 天内的 signed/executing 合同，
   * 为对应客户创建 warning 状态的续约记录（若不存在）。
   * phase 8 接定时任务每日 08:00 跑。
   */
  async scanWarnings(tenantId?: string): Promise<RenewalRecordEntity[]> {
    const now = new Date();
    const threshold = new Date(now.getTime() + WARNING_WINDOW_DAYS * 86400_000);

    const qb = this.contracts.createQueryBuilder('c')
      .where('c.status IN (:...st)', { st: ['signed', 'executing'] })
      .andWhere('c.createdAt < :now', { now }); // 已签字
    if (tenantId) qb.andWhere('c.tenantId = :tid', { tid: tenantId });
    const candidates = await qb.getMany();

    // 合同没有独立 expiresAt，用 customer.contractExpiresAt；若为空用 signedAt + 90 天粗估
    const created: RenewalRecordEntity[] = [];
    for (const contract of candidates) {
      const customer = await this.customers.findOne({
        where: { id: contract.customerId },
      });
      if (!customer) continue;
      const expiresAt = customer.contractExpiresAt ??
        (contract.signedAt ? new Date(contract.signedAt.getTime() + 90 * 86400_000) : null);
      if (!expiresAt) continue;
      if (expiresAt > threshold) continue;

      // 已有 warning/negotiating 记录则跳过
      const existing = await this.renewals.findOne({
        where: {
          tenantId: contract.tenantId,
          customerId: contract.customerId,
          originalContractId: contract.id,
        },
      });
      if (existing && ['warning', 'negotiating'].includes(existing.stage)) continue;

      const row = this.renewals.create({
        tenantId: contract.tenantId,
        customerId: contract.customerId,
        originalContractId: contract.id,
        stage: 'warning',
        expiresAt,
      });
      const saved = await this.renewals.save(row);
      created.push(saved);

      // 推客户 stage → renewing
      if (customer.stage === 'delivering' || customer.stage === 'reviewing') {
        await this.customersSvc.transitionStage(
          contract.tenantId,
          customer.id,
          'renewing',
        );
      }
    }
    return created;
  }

  async board(tenantId: string): Promise<RenewalRecordEntity[]> {
    return this.renewals.find({
      where: [
        { tenantId, stage: 'warning' },
        { tenantId, stage: 'negotiating' },
      ],
      order: { expiresAt: 'ASC' },
    });
  }

  async list(tenantId: string, stage?: RenewalStage): Promise<RenewalRecordEntity[]> {
    const where = stage ? { tenantId, stage } : { tenantId };
    return this.renewals.find({ where, order: { updatedAt: 'DESC' } });
  }

  async findById(tenantId: string, id: string): Promise<RenewalRecordEntity> {
    const row = await this.renewals.findOne({ where: { tenantId, id } });
    if (!row) throw new NotFoundException({ code: 'RENEWAL_NOT_FOUND', message: '续约记录不存在' });
    return row;
  }

  /**
   * 基于客户过去数据 + 优惠政策生成续约提案（mock LLM）。
   * 优惠策略：
   *  - 绿灯客户 → 5% 折扣
   *  - 黄灯客户 → 平价
   *  - 红灯客户 → 平价 + 客户成功保障条款
   */
  async generateProposal(
    tenantId: string,
    staffId: string,
    id: string,
  ): Promise<RenewalRecordEntity> {
    const row = await this.findById(tenantId, id);
    if (row.stage === 'won' || row.stage === 'lost') {
      throw new ConflictException({
        code: 'RENEWAL_CLOSED',
        message: `续约已 ${row.stage}，不能再生成提案`,
      });
    }
    const customer = await this.customers.findOne({
      where: { id: row.customerId },
    });
    if (!customer) throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: '客户不存在' });

    const discount = customer.healthLevel === 'green' ? 0.05 : 0;
    const llm = await this.llm.invoke(
      'renewal.proposal',
      {
        companyName: customer.companyName,
        healthLevel: customer.healthLevel,
        discountRatio: discount,
        expiresAt: row.expiresAt.toISOString(),
      },
      { tenantId, staffId, temperature: 0.3 },
    );

    row.proposal = llm.content;
    row.discountRatio = discount;
    if (row.stage === 'warning') row.stage = 'negotiating';
    return this.renewals.save(row);
  }

  async addNote(
    tenantId: string,
    staffId: string,
    renewalId: string,
    body: { channel?: 'phone' | 'wechat' | 'visit' | 'other'; notes: string },
  ): Promise<NegotiationNoteEntity> {
    await this.findById(tenantId, renewalId);
    const row = this.notes.create({
      tenantId,
      renewalId,
      staffId,
      channel: body.channel ?? 'phone',
      notes: body.notes,
    });
    return this.notes.save(row);
  }

  async listNotes(tenantId: string, renewalId: string): Promise<NegotiationNoteEntity[]> {
    return this.notes.find({
      where: { tenantId, renewalId },
      order: { createdAt: 'DESC' },
    });
  }

  async markWon(tenantId: string, id: string): Promise<RenewalRecordEntity> {
    const row = await this.findById(tenantId, id);
    if (row.stage === 'lost') {
      throw new ConflictException({
        code: 'RENEWAL_ALREADY_LOST',
        message: '续约已标为流失',
      });
    }
    row.stage = 'won';
    await this.renewals.save(row);
    // 客户 stage 从 renewing → delivering（待新合同签完会再推到 signed）
    // 简化：这里直接回到 delivering，phase 8 起与新合同签字流程联动
    const customer = await this.customers.findOne({ where: { id: row.customerId } });
    if (customer && customer.stage === 'renewing') {
      await this.customersSvc.transitionStage(tenantId, customer.id, 'delivering');
    }
    return row;
  }

  async markLost(
    tenantId: string,
    id: string,
    reason: 'product' | 'price' | 'effect' | 'closure' | 'other',
    analysis?: string,
  ): Promise<RenewalRecordEntity> {
    const row = await this.findById(tenantId, id);
    if (row.stage === 'won') {
      throw new ConflictException({
        code: 'RENEWAL_ALREADY_WON',
        message: '续约已成功，不能再标流失',
      });
    }
    row.stage = 'lost';
    row.lostReason = reason;
    row.lostAnalysis = analysis ?? null;
    await this.renewals.save(row);
    return row;
  }
}

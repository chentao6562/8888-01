import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, DataSource } from 'typeorm';
import { randomBytes } from 'crypto';
import {
  ContractEntity,
  ContractStatus,
  CONTRACT_STATUS_TRANSITIONS,
} from './entities/contract.entity';
import { ContractTemplateEntity } from './entities/contract-template.entity';
import {
  PaymentEntity,
  PaymentStage,
  PAYMENT_RATIOS,
} from './entities/payment.entity';
import { CustomersService } from '@/modules/customers/customers.service';
import { TenantsService } from '@/modules/tenants/tenants.service';
import { EsignService } from '@/modules/esign/esign.service';
import { PositioningBookEntity } from '@/modules/proposals/entities/positioning-book.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(ContractEntity)
    private readonly contracts: Repository<ContractEntity>,
    @InjectRepository(ContractTemplateEntity)
    private readonly templates: Repository<ContractTemplateEntity>,
    @InjectRepository(PaymentEntity)
    private readonly payments: Repository<PaymentEntity>,
    @InjectRepository(PositioningBookEntity)
    private readonly proposals: Repository<PositioningBookEntity>,
    private readonly customers: CustomersService,
    private readonly tenants: TenantsService,
    private readonly esign: EsignService,
    private readonly dataSource: DataSource,
  ) {}

  // --- Templates ---

  async listTemplates(tenantId: string): Promise<ContractTemplateEntity[]> {
    return this.templates.find({
      where: [{ tenantId: IsNull() }, { tenantId }],
      order: { tier: 'ASC', updatedAt: 'DESC' },
    });
  }

  async createTemplate(
    tenantId: string,
    params: { tier: string; name: string; body: string },
  ): Promise<ContractTemplateEntity> {
    const tpl = this.templates.create({
      tenantId,
      tier: params.tier as ContractTemplateEntity['tier'],
      name: params.name,
      body: params.body,
    });
    return this.templates.save(tpl);
  }

  // --- Contracts ---

  async list(tenantId: string, status?: ContractStatus): Promise<ContractEntity[]> {
    const where = status ? { tenantId, status } : { tenantId };
    return this.contracts.find({ where, order: { updatedAt: 'DESC' } });
  }

  async findById(tenantId: string, id: string): Promise<ContractEntity> {
    const c = await this.contracts.findOne({ where: { tenantId, id } });
    if (!c) throw new NotFoundException({ code: 'CONTRACT_NOT_FOUND', message: '合同不存在' });
    return c;
  }

  async create(
    tenantId: string,
    createdBy: string,
    dto: CreateContractDto,
  ): Promise<{ contract: ContractEntity; payments: PaymentEntity[] }> {
    const proposal = await this.proposals.findOne({
      where: { tenantId, id: dto.proposalId },
    });
    if (!proposal) {
      throw new NotFoundException({
        code: 'PROPOSAL_NOT_FOUND',
        message: '方案不存在',
      });
    }
    if (proposal.status !== 'signed') {
      throw new UnprocessableEntityException({
        code: 'PROPOSAL_NOT_SIGNED',
        message: '方案未签字，不能创建合同',
      });
    }

    const totalAmount = dto.totalAmount ?? proposal.priceQuote;
    if (totalAmount <= 0) {
      throw new BadRequestException({
        code: 'INVALID_AMOUNT',
        message: '合同金额必须 > 0',
      });
    }

    // 选模板
    let templateId = dto.templateId ?? null;
    let body = '';
    if (templateId) {
      const tpl = await this.templates.findOne({ where: { id: templateId } });
      if (!tpl) {
        throw new NotFoundException({
          code: 'TEMPLATE_NOT_FOUND',
          message: '合同模板不存在',
        });
      }
      body = this.render(tpl.body, { proposal, totalAmount });
    } else {
      // 找 tier 匹配模板（官方或本租户）
      const candidates = await this.templates.find({
        where: [
          { tenantId: IsNull(), tier: proposal.planTier },
          { tenantId, tier: proposal.planTier },
        ],
        order: { updatedAt: 'DESC' },
      });
      if (candidates.length > 0) {
        templateId = candidates[0].id;
        body = this.render(candidates[0].body, { proposal, totalAmount });
      } else {
        body = this.defaultBody({ proposal, totalAmount });
      }
    }

    // 付款到期日：用户传入覆盖默认（从今天起 30/60/90/120 天）
    const now = Date.now();
    const dueMap = new Map<PaymentStage, Date>();
    if (dto.paymentDueDates?.length) {
      for (const d of dto.paymentDueDates) dueMap.set(d.stage, new Date(d.dueAt));
    } else {
      PAYMENT_RATIOS.forEach((r, idx) => {
        dueMap.set(r.stage, new Date(now + (idx + 1) * 30 * 86400_000));
      });
    }

    return this.dataSource.transaction(async (manager) => {
      const contract = manager.getRepository(ContractEntity).create({
        tenantId,
        customerId: proposal.customerId,
        proposalId: proposal.id,
        templateId,
        contractNo: this.generateContractNo(),
        totalAmount,
        status: 'draft',
        bodySnapshot: body,
        variablesSnapshot: JSON.stringify({ proposal, totalAmount }),
        createdBy,
      });
      const saved = await manager.getRepository(ContractEntity).save(contract);

      const paymentRows: PaymentEntity[] = [];
      for (const r of PAYMENT_RATIOS) {
        const p = manager.getRepository(PaymentEntity).create({
          tenantId,
          contractId: saved.id,
          customerId: saved.customerId,
          stage: r.stage,
          ratio: r.ratio,
          amount: Math.round(totalAmount * r.ratio),
          dueAt: dueMap.get(r.stage) ?? null,
          status: 'pending',
        });
        paymentRows.push(await manager.getRepository(PaymentEntity).save(p));
      }

      return { contract: saved, payments: paymentRows };
    });
  }

  async update(
    tenantId: string,
    id: string,
    patch: { bodySnapshot?: string; totalAmount?: number },
  ): Promise<ContractEntity> {
    const contract = await this.findById(tenantId, id);
    if (contract.status !== 'draft') {
      throw new ConflictException({
        code: 'CONTRACT_NOT_EDITABLE',
        message: `合同 ${contract.status} 状态下不可编辑`,
      });
    }
    if (patch.bodySnapshot !== undefined) contract.bodySnapshot = patch.bodySnapshot;
    if (patch.totalAmount !== undefined) {
      contract.totalAmount = patch.totalAmount;
      // 重算 payment.amount
      const pays = await this.payments.find({ where: { tenantId, contractId: id } });
      for (const p of pays) {
        p.amount = Math.round(patch.totalAmount * p.ratio);
        await this.payments.save(p);
      }
    }
    return this.contracts.save(contract);
  }

  async listPayments(tenantId: string, contractId: string): Promise<PaymentEntity[]> {
    await this.findById(tenantId, contractId);
    return this.payments.find({
      where: { tenantId, contractId },
      order: { ratio: 'DESC' },
    });
  }

  // --- Status machine ---

  async transition(
    tenantId: string,
    id: string,
    to: ContractStatus,
  ): Promise<ContractEntity> {
    const contract = await this.findById(tenantId, id);
    const allowed = CONTRACT_STATUS_TRANSITIONS[contract.status];
    if (!allowed.includes(to)) {
      throw new ConflictException({
        code: 'CONTRACT_INVALID_STATUS_TRANSITION',
        message: `不能从 ${contract.status} 跳到 ${to}`,
      });
    }
    contract.status = to;
    return this.contracts.save(contract);
  }

  // --- E-sign ---

  async sendForSigning(
    tenantId: string,
    id: string,
  ): Promise<{ contract: ContractEntity; orderId: string; signUrl: string }> {
    const contract = await this.findById(tenantId, id);
    if (contract.status !== 'draft') {
      throw new ConflictException({
        code: 'CONTRACT_INVALID_STATUS_TRANSITION',
        message: `合同 ${contract.status} 不能再次发送`,
      });
    }
    const customer = await this.customers.findByIdOrFail(tenantId, contract.customerId);
    const result = await this.esign.send({
      tenantId,
      contractId: contract.id,
      contractNo: contract.contractNo,
      body: contract.bodySnapshot,
      signers: [{ name: customer.bossName, phone: customer.bossPhone }],
    });
    contract.status = 'pending_sign';
    contract.esignOrderId = result.orderId;
    await this.contracts.save(contract);
    return { contract, orderId: result.orderId, signUrl: result.signUrl };
  }

  /**
   * 回调（mock: 任何人触发即生效；真实 provider 要校验签名）。
   * 成功：contract.status = signed · signedAt 填充 · 触发 customer.stage = signed（若尚未）。
   */
  async handleCallback(
    tenantId: string,
    orderId: string,
    signed: boolean,
  ): Promise<ContractEntity> {
    const contract = await this.contracts.findOne({
      where: { tenantId, esignOrderId: orderId },
    });
    if (!contract) {
      throw new NotFoundException({
        code: 'ESIGN_ORDER_NOT_FOUND',
        message: '订单不存在',
      });
    }
    if (signed) {
      // 幂等：已签字则直接返回
      if (contract.status === 'signed' || contract.status === 'executing') return contract;
      contract.status = 'signed';
      contract.signedAt = new Date();
      await this.contracts.save(contract);
      // 联动：客户 stage 若还在 proposing，顺势推到 signed
      const customer = await this.customers.findByIdOrFail(tenantId, contract.customerId);
      if (customer.stage === 'proposing') {
        await this.customers.transitionStage(tenantId, customer.id, 'signed');
      }
    } else {
      contract.status = 'terminated';
      await this.contracts.save(contract);
    }
    return contract;
  }

  // --- Payments ---

  async registerPayment(
    tenantId: string,
    contractId: string,
    paymentId: string,
    registeredBy: string,
    dto: RegisterPaymentDto,
  ): Promise<PaymentEntity> {
    const payment = await this.payments.findOne({
      where: { tenantId, contractId, id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException({
        code: 'PAYMENT_NOT_FOUND',
        message: '付款记录不存在',
      });
    }
    // 幂等：同一 idempotencyKey 在 notes 字段做 marker
    const key = `[idem:${dto.idempotencyKey}]`;
    if (payment.notes && payment.notes.includes(key)) {
      return payment; // 已处理
    }
    if (payment.status === 'paid') {
      throw new ConflictException({
        code: 'PAYMENT_ALREADY_PAID',
        message: '该笔款已登记',
      });
    }
    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.registeredBy = registeredBy;
    payment.voucherUrl = dto.voucherUrl ?? payment.voucherUrl;
    payment.notes = `${dto.notes ?? ''} ${key}`.trim();
    return this.payments.save(payment);
  }

  async uploadVoucher(
    tenantId: string,
    contractId: string,
    paymentId: string,
    voucherUrl: string,
  ): Promise<PaymentEntity> {
    const payment = await this.payments.findOne({
      where: { tenantId, contractId, id: paymentId },
    });
    if (!payment) throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: '付款记录不存在' });
    payment.voucherUrl = voucherUrl;
    return this.payments.save(payment);
  }

  // --- helpers ---

  private generateContractNo(): string {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = randomBytes(3).toString('hex').toUpperCase();
    return `CT-${ymd}-${rand}`;
  }

  private render(tpl: string, vars: { proposal: PositioningBookEntity; totalAmount: number }): string {
    const map: Record<string, string> = {
      '{{companyName}}': vars.proposal.customerId, // phase 3 简化，真正公司名由上层拼
      '{{planTier}}': vars.proposal.planTier,
      '{{totalAmount}}': String(vars.totalAmount),
      '{{totalAmountYuan}}': (vars.totalAmount / 100).toFixed(2),
      '{{onePager}}': vars.proposal.onePager ?? '',
    };
    let out = tpl;
    for (const [k, v] of Object.entries(map)) out = out.split(k).join(v);
    return out;
  }

  private defaultBody(vars: { proposal: PositioningBookEntity; totalAmount: number }): string {
    return [
      `# MindLink 代运营服务合同（通用模板）`,
      ``,
      `- 套餐：${vars.proposal.planTier}`,
      `- 总金额：¥ ${(vars.totalAmount / 100).toFixed(2)}`,
      `- 分笔：20% 策划 + 40% 拍摄 + 35% 剪辑 + 5% 尾款`,
      ``,
      `## 一、服务内容`,
      vars.proposal.onePager ?? '(见定位书附件)',
      ``,
      `## 二、双方权责`,
      `- 乙方：按套餐交付约定的视频数量与投流动作`,
      `- 甲方：在成片审核窗口内（48 小时）完成审核`,
      ``,
      `## 三、知识产权`,
      `视频素材甲方拥有使用权，乙方保留方法论复用权。`,
      ``,
      `## 四、违约`,
      `任一方严重违约，另一方可书面通知终止合同，未消耗款项退还。`,
      ``,
      `> 本合同由系统根据方案自动生成，签字前请 PM 核对细节。`,
    ].join('\n');
  }
}

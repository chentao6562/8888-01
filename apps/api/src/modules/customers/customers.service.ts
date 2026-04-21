import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  CustomerEntity,
  CustomerStage,
  STAGE_TRANSITIONS,
} from './entities/customer.entity';
import { LeadFollowUpEntity } from './entities/lead-follow-up.entity';
import { StaffEntity } from '@/modules/staff/entities/staff.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersDto } from './dto/list-customers.dto';
import { CreateFollowUpDto } from './dto/follow-up.dto';

export interface PaginatedCustomers {
  data: CustomerEntity[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface StageCounts {
  total: number;
  byStage: Record<CustomerStage, number>;
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly repo: Repository<CustomerEntity>,
    @InjectRepository(LeadFollowUpEntity)
    private readonly followUps: Repository<LeadFollowUpEntity>,
    @InjectRepository(StaffEntity)
    private readonly staff: Repository<StaffEntity>,
  ) {}

  async findById(tenantId: string, id: string): Promise<CustomerEntity | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  async findByIdOrFail(tenantId: string, id: string): Promise<CustomerEntity> {
    const customer = await this.findById(tenantId, id);
    if (!customer) {
      throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: '客户不存在' });
    }
    return customer;
  }

  async list(tenantId: string, query: ListCustomersDto): Promise<PaginatedCustomers> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.repo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId });

    if (query.stage) qb.andWhere('c.stage = :stage', { stage: query.stage });
    if (query.industry) qb.andWhere('c.industry = :industry', { industry: query.industry });
    if (query.search) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('c.companyName LIKE :kw', { kw: `%${query.search}%` })
            .orWhere('c.shopName LIKE :kw', { kw: `%${query.search}%` })
            .orWhere('c.bossName LIKE :kw', { kw: `%${query.search}%` })
            .orWhere('c.industry LIKE :kw', { kw: `%${query.search}%` });
        }),
      );
    }

    qb.orderBy('c.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 },
    };
  }

  async stageCounts(tenantId: string): Promise<StageCounts> {
    const rows = await this.repo
      .createQueryBuilder('c')
      .select('c.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .where('c.tenantId = :tenantId', { tenantId })
      .groupBy('c.stage')
      .getRawMany<{ stage: CustomerStage; count: string }>();

    const byStage = {
      lead: 0,
      diagnosing: 0,
      proposing: 0,
      signed: 0,
      delivering: 0,
      reviewing: 0,
      renewing: 0,
      churned: 0,
    } as Record<CustomerStage, number>;
    let total = 0;
    for (const row of rows) {
      const n = Number(row.count);
      byStage[row.stage] = n;
      total += n;
    }
    return { total, byStage };
  }

  async create(
    tenantId: string,
    createdBy: string,
    dto: CreateCustomerDto,
  ): Promise<CustomerEntity> {
    // 同公司名不重复（同租户内）
    const existing = await this.repo.findOne({
      where: { tenantId, companyName: dto.companyName },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CUSTOMER_COMPANY_EXISTS',
        message: '该公司名已存在',
      });
    }
    const customer = this.repo.create({
      tenantId,
      companyName: dto.companyName,
      shopName: dto.shopName ?? null,
      bossName: dto.bossName,
      bossPhone: dto.bossPhone,
      bossWechat: dto.bossWechat ?? null,
      industry: dto.industry,
      region: dto.region ?? null,
      storeCount: dto.storeCount ?? 1,
      source: dto.source ?? 'other',
      budgetHint: dto.budgetHint ?? 'unknown',
      notes: dto.notes ?? null,
      stage: 'lead',
      healthScore: 75,
      healthLevel: 'green',
      pmId: dto.pmId ?? null,
      strategistId: dto.strategistId ?? null,
      createdBy,
    });
    const saved = await this.repo.save(customer);

    // 自动分配：如果没指定 pm/策划，按工作量均衡
    if (!saved.pmId) saved.pmId = await this.autoAssign(tenantId, 'pm');
    if (!saved.strategistId)
      saved.strategistId = await this.autoAssign(tenantId, 'strategist');
    return this.repo.save(saved);
  }

  async update(
    tenantId: string,
    id: string,
    patch: Partial<CustomerEntity>,
  ): Promise<CustomerEntity> {
    const customer = await this.findByIdOrFail(tenantId, id);
    // 禁止直接改 stage 走 transition 接口
    const { stage: _stage, id: _id, tenantId: _tid, ...safe } = patch;
    void _stage; void _id; void _tid;
    Object.assign(customer, safe);
    return this.repo.save(customer);
  }

  async transitionStage(
    tenantId: string,
    id: string,
    to: CustomerStage,
  ): Promise<CustomerEntity> {
    const customer = await this.findByIdOrFail(tenantId, id);
    const allowed = STAGE_TRANSITIONS[customer.stage];
    if (!allowed.includes(to)) {
      throw new ConflictException({
        code: 'CUSTOMER_INVALID_STAGE_TRANSITION',
        message: `不能从 ${customer.stage} 跳到 ${to}`,
      });
    }
    customer.stage = to;
    if (to === 'churned') customer.churnedAt = new Date();
    return this.repo.save(customer);
  }

  async archive(tenantId: string, id: string): Promise<CustomerEntity> {
    return this.transitionStage(tenantId, id, 'churned');
  }

  async addFollowUp(
    tenantId: string,
    customerId: string,
    staffId: string,
    dto: CreateFollowUpDto,
  ): Promise<LeadFollowUpEntity> {
    const customer = await this.findByIdOrFail(tenantId, customerId);
    const row = this.followUps.create({
      tenantId,
      customerId: customer.id,
      staffId,
      channel: dto.channel,
      notes: dto.notes,
    });
    const saved = await this.followUps.save(row);
    customer.lastContactAt = new Date();
    await this.repo.save(customer);
    return saved;
  }

  async listFollowUps(
    tenantId: string,
    customerId: string,
  ): Promise<LeadFollowUpEntity[]> {
    return this.followUps.find({
      where: { tenantId, customerId },
      order: { createdAt: 'DESC' },
    });
  }

  /** 简单的自动分配策略：取当前负责人活跃客户最少者。 */
  private async autoAssign(
    tenantId: string,
    role: 'pm' | 'strategist',
  ): Promise<string | null> {
    const candidates = await this.staff.find({
      where: { tenantId, role, status: 'active' },
    });
    if (candidates.length === 0) return null;

    const counts = await Promise.all(
      candidates.map(async (s) => {
        const n = await this.repo.count({
          where: role === 'pm' ? { tenantId, pmId: s.id } : { tenantId, strategistId: s.id },
        });
        return { staffId: s.id, count: n };
      }),
    );
    counts.sort((a, b) => a.count - b.count);
    return counts[0]?.staffId ?? null;
  }

  async assertOwnership(
    tenantId: string,
    customerId: string,
    staffId: string,
    role: string,
  ): Promise<CustomerEntity> {
    const customer = await this.findByIdOrFail(tenantId, customerId);
    if (role === 'admin' || role === 'pm') return customer;
    if (role === 'strategist') {
      if (customer.strategistId === staffId || customer.strategistId == null) return customer;
    }
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: '只能访问自己负责的客户',
    });
  }
}

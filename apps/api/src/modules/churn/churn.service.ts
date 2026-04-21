import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { ChurnRecordEntity, ChurnReason } from './entities/churn-record.entity';
import { CustomersService } from '@/modules/customers/customers.service';

@Injectable()
export class ChurnService {
  constructor(
    @InjectRepository(ChurnRecordEntity)
    private readonly repo: Repository<ChurnRecordEntity>,
    private readonly customers: CustomersService,
  ) {}

  async list(tenantId: string, reason?: ChurnReason): Promise<ChurnRecordEntity[]> {
    const where = reason ? { tenantId, reason } : { tenantId };
    return this.repo.find({ where, order: { churnedAt: 'DESC' } });
  }

  async create(
    tenantId: string,
    createdBy: string,
    input: {
      customerId: string;
      renewalId?: string;
      reason: ChurnReason;
      interviewNotes?: string;
      improvementSuggestion?: string;
    },
  ): Promise<ChurnRecordEntity> {
    const existing = await this.repo.findOne({
      where: { tenantId, customerId: input.customerId },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CHURN_ALREADY_EXISTS',
        message: '该客户已有流失记录',
      });
    }
    const row = this.repo.create({
      tenantId,
      customerId: input.customerId,
      renewalId: input.renewalId ?? null,
      reason: input.reason,
      interviewNotes: input.interviewNotes ?? null,
      improvementSuggestion: input.improvementSuggestion ?? null,
      churnedAt: new Date(),
      createdBy,
    });
    const saved = await this.repo.save(row);

    // 推客户 stage → churned
    const customer = await this.customers.findById(tenantId, input.customerId);
    if (customer && customer.stage !== 'churned') {
      await this.customers.transitionStage(tenantId, customer.id, 'churned');
    }
    return saved;
  }

  async updateInterview(
    tenantId: string,
    id: string,
    body: { interviewNotes?: string; improvementSuggestion?: string },
  ): Promise<ChurnRecordEntity> {
    const row = await this.repo.findOne({ where: { tenantId, id } });
    if (!row) throw new NotFoundException({ code: 'CHURN_NOT_FOUND', message: '流失记录不存在' });
    if (body.interviewNotes !== undefined) row.interviewNotes = body.interviewNotes;
    if (body.improvementSuggestion !== undefined) row.improvementSuggestion = body.improvementSuggestion;
    return this.repo.save(row);
  }

  /** 月度流失分析：按原因分组 + Top N */
  async monthlyAnalysis(tenantId: string, month: string) {
    const start = new Date(`${month}-01T00:00:00Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const rows = await this.repo.find({
      where: { tenantId, churnedAt: Between(start, end) },
    });
    const byReason: Record<string, number> = {
      product: 0, price: 0, effect: 0, closure: 0, other: 0,
    };
    for (const r of rows) byReason[r.reason] = (byReason[r.reason] ?? 0) + 1;
    return {
      total: rows.length,
      byReason,
      top3: Object.entries(byReason)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([reason, count]) => ({ reason, count })),
    };
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Repository } from 'typeorm';
import { NpsRecordEntity } from './entities/nps-record.entity';

@Injectable()
export class NpsService {
  constructor(
    @InjectRepository(NpsRecordEntity)
    private readonly repo: Repository<NpsRecordEntity>,
  ) {}

  async submit(
    tenantId: string,
    input: {
      customerId: string;
      reportId?: string;
      score: number;
      comment?: string;
      submittedBy?: string;
    },
  ): Promise<NpsRecordEntity> {
    if (input.score < 0 || input.score > 10) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'score 必须在 0-10',
      });
    }
    const existing = await this.repo.findOne({
      where: {
        tenantId,
        customerId: input.customerId,
        reportId: input.reportId ?? IsNull(),
      },
    });
    if (existing) {
      throw new ConflictException({
        code: 'NPS_ALREADY_SUBMITTED',
        message: '已为该报告提交过 NPS',
      });
    }
    const row = this.repo.create({
      tenantId,
      customerId: input.customerId,
      reportId: input.reportId ?? null,
      score: input.score,
      comment: input.comment ?? null,
      submittedBy: input.submittedBy ?? null,
    });
    return this.repo.save(row);
  }

  async list(tenantId: string, customerId?: string): Promise<NpsRecordEntity[]> {
    const where = customerId ? { tenantId, customerId } : { tenantId };
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  /** 某客户某月均分（用于健康度的 NPS 维度） · 0-10 → 0-100 */
  async monthlyAvgScoreNormalized(
    tenantId: string,
    customerId: string,
    month: string,
  ): Promise<number> {
    const start = new Date(`${month}-01T00:00:00Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const rows = await this.repo.find({
      where: { tenantId, customerId, createdAt: Between(start, end) },
    });
    if (rows.length === 0) return 75; // 无数据默认 7.5
    const avg = rows.reduce((s, r) => s + r.score, 0) / rows.length;
    return Math.round(avg * 10);
  }
}

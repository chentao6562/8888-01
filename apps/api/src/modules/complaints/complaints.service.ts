import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  ComplaintEntity,
  ComplaintSeverity,
  ComplaintStatus,
} from './entities/complaint.entity';

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectRepository(ComplaintEntity)
    private readonly repo: Repository<ComplaintEntity>,
  ) {}

  async list(
    tenantId: string,
    filters: { customerId?: string; status?: ComplaintStatus } = {},
  ): Promise<ComplaintEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.status) where.status = filters.status;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async create(
    tenantId: string,
    input: {
      customerId: string;
      severity?: ComplaintSeverity;
      content: string;
      source?: 'pm' | 'customer';
    },
  ): Promise<ComplaintEntity> {
    const row = this.repo.create({
      tenantId,
      customerId: input.customerId,
      severity: input.severity ?? 'mid',
      content: input.content,
      source: input.source ?? 'pm',
      status: 'open',
    });
    return this.repo.save(row);
  }

  async handle(
    tenantId: string,
    id: string,
    handledBy: string,
    resolution: string,
  ): Promise<ComplaintEntity> {
    const row = await this.repo.findOne({ where: { tenantId, id } });
    if (!row) throw new NotFoundException({ code: 'COMPLAINT_NOT_FOUND', message: '投诉不存在' });
    row.status = 'closed';
    row.handledBy = handledBy;
    row.handledAt = new Date();
    row.resolution = resolution;
    return this.repo.save(row);
  }

  /** 某客户某月投诉加权分（给健康度用）· low=5 mid=15 high=30 */
  async monthlyPenalty(
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
    let penalty = 0;
    for (const r of rows) {
      penalty += r.severity === 'high' ? 30 : r.severity === 'mid' ? 15 : 5;
    }
    return penalty;
  }
}

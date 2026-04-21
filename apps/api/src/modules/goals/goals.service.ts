import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyGoalEntity } from './entities/company-goal.entity';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(CompanyGoalEntity)
    private readonly repo: Repository<CompanyGoalEntity>,
  ) {}

  async current(tenantId: string): Promise<CompanyGoalEntity | null> {
    const month = currentMonth();
    return this.repo.findOne({ where: { tenantId, month } });
  }

  async upsert(
    tenantId: string,
    body: {
      month?: string;
      newCustomers: number;
      renewalCustomers: number;
      churnRedLine: number;
      targetRevenue: number;
      targetArpu: number;
    },
  ): Promise<CompanyGoalEntity> {
    const month = body.month ?? currentMonth();
    let row = await this.repo.findOne({ where: { tenantId, month } });
    if (!row) {
      row = this.repo.create({ tenantId, month });
    }
    row.newCustomers = body.newCustomers;
    row.renewalCustomers = body.renewalCustomers;
    row.churnRedLine = body.churnRedLine;
    row.targetRevenue = body.targetRevenue;
    row.targetArpu = body.targetArpu;
    return this.repo.save(row);
  }

  async history(tenantId: string): Promise<CompanyGoalEntity[]> {
    return this.repo.find({ where: { tenantId }, order: { month: 'DESC' }, take: 12 });
  }
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

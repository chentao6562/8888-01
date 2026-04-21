import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository } from 'typeorm';
import { CaseEntity, CaseCategory } from './entities/case.entity';

export interface CreateCaseInput {
  category: CaseCategory;
  title: string;
  content: string;
  industry?: string;
  tags?: string[];
  videoRef?: string;
  metrics?: Record<string, number>;
}

@Injectable()
export class CasesService {
  constructor(
    @InjectRepository(CaseEntity)
    private readonly repo: Repository<CaseEntity>,
  ) {}

  /** 租户私库 + 官方库（tenantId=null）。 */
  async list(
    tenantId: string,
    filters: { category?: CaseCategory; search?: string } = {},
  ): Promise<CaseEntity[]> {
    const qb = this.repo
      .createQueryBuilder('c')
      .where(
        new Brackets((b) => {
          b.where('c.tenantId = :tenantId', { tenantId }).orWhere('c.tenantId IS NULL');
        }),
      );
    if (filters.category) qb.andWhere('c.category = :cat', { cat: filters.category });
    if (filters.search) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('c.title LIKE :kw', { kw: `%${filters.search}%` })
            .orWhere('c.content LIKE :kw', { kw: `%${filters.search}%` })
            .orWhere('c.industry LIKE :kw', { kw: `%${filters.search}%` });
        }),
      );
    }
    qb.orderBy('c.callCount', 'DESC').addOrderBy('c.updatedAt', 'DESC').take(100);
    return qb.getMany();
  }

  /** GET 详情时 callCount++（phase 4 简化策略）。 */
  async findByIdAndTouch(tenantId: string, id: string): Promise<CaseEntity> {
    const row = await this.repo
      .createQueryBuilder('c')
      .where('c.id = :id', { id })
      .andWhere(
        new Brackets((b) => {
          b.where('c.tenantId = :tenantId', { tenantId }).orWhere('c.tenantId IS NULL');
        }),
      )
      .getOne();
    if (!row) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: '案例不存在' });
    row.callCount = (row.callCount ?? 0) + 1;
    row.lastCalledAt = new Date();
    await this.repo.save(row);
    return row;
  }

  async create(
    tenantId: string,
    createdBy: string,
    input: CreateCaseInput,
  ): Promise<CaseEntity> {
    const row = this.repo.create({
      tenantId,
      createdBy,
      category: input.category,
      title: input.title,
      content: input.content,
      industry: input.industry ?? null,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      videoRef: input.videoRef ?? null,
      metrics: input.metrics ? JSON.stringify(input.metrics) : null,
      callCount: 0,
      freshness: 'fresh',
    });
    return this.repo.save(row);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const row = await this.repo.findOne({ where: { tenantId, id } });
    if (!row) {
      throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: '案例不存在（或为只读官方库）' });
    }
    await this.repo.remove(row);
  }

  async bulkCreateOfficial(rows: CreateCaseInput[]): Promise<void> {
    const existing = await this.repo.count({ where: { tenantId: IsNull() } });
    if (existing > 0) return;
    for (const r of rows) {
      await this.repo.save(
        this.repo.create({
          tenantId: null,
          category: r.category,
          title: r.title,
          content: r.content,
          industry: r.industry ?? null,
          tags: r.tags ? JSON.stringify(r.tags) : null,
          videoRef: null,
          metrics: r.metrics ? JSON.stringify(r.metrics) : null,
          callCount: 0,
          freshness: 'fresh',
        }),
      );
    }
  }
}

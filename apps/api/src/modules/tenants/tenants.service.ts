import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { PLAN_MAX_STAFF, TenantEntity, TenantPlan } from './entities/tenant.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly repo: Repository<TenantEntity>,
  ) {}

  async create(params: {
    name: string;
    plan: TenantPlan;
    contactPhone?: string;
    contactEmail?: string;
  }): Promise<TenantEntity> {
    const tenant = this.repo.create({
      name: params.name,
      plan: params.plan,
      maxStaff: PLAN_MAX_STAFF[params.plan],
      contactPhone: params.contactPhone ?? null,
      contactEmail: params.contactEmail ?? null,
      status: 'active',
    });
    return this.repo.save(tenant);
  }

  async findById(id: string): Promise<TenantEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async updateOwner(id: string, ownerId: string): Promise<void> {
    await this.repo.update({ id }, { ownerId });
  }

  async update(id: string, patch: DeepPartial<TenantEntity>): Promise<TenantEntity> {
    const tenant = await this.findById(id);
    if (!tenant) {
      throw new NotFoundException({ code: 'TENANT_NOT_FOUND', message: '租户不存在' });
    }
    Object.assign(tenant, patch);
    return this.repo.save(tenant);
  }
}

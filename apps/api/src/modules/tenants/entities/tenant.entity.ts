import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TenantPlan = 'basic' | 'pro' | 'enterprise';
export type TenantStatus = 'active' | 'suspended' | 'expired';

/** 一家代运营公司 = 一个租户（对齐 data-model §2.1）。 */
@Entity('tenants')
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'basic' })
  plan!: TenantPlan;

  @Column({ name: 'max_staff', type: 'int', default: 5 })
  maxStaff!: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: TenantStatus;

  @Column({ name: 'owner_id', type: 'varchar', length: 36, nullable: true })
  ownerId!: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 20, nullable: true })
  contactPhone!: string | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 120, nullable: true })
  contactEmail!: string | null;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

export const PLAN_MAX_STAFF: Record<TenantPlan, number> = {
  basic: 5,
  pro: 20,
  enterprise: 50,
};

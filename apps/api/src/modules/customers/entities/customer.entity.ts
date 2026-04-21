import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CustomerStage =
  | 'lead'
  | 'diagnosing'
  | 'proposing'
  | 'signed'
  | 'delivering'
  | 'reviewing'
  | 'renewing'
  | 'churned';

export type LeadSource = 'referral' | 'website' | 'outreach' | 'ad' | 'other';
export type BudgetHint = 'lt_5k' | '5k_10k' | '10k_30k' | 'gt_30k' | 'unknown';
export type HealthLevel = 'green' | 'yellow' | 'red';

/** 客户。对齐 docs/shared/data-model.md §2.3。 */
@Entity('customers')
@Index(['tenantId', 'stage'])
@Index(['tenantId', 'pmId'])
export class CustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  // --- 基础 ---
  @Column({ name: 'company_name', type: 'varchar', length: 120 })
  companyName!: string;

  @Column({ name: 'shop_name', type: 'varchar', length: 120, nullable: true })
  shopName!: string | null;

  @Column({ name: 'boss_name', type: 'varchar', length: 60 })
  bossName!: string;

  @Column({ name: 'boss_phone', type: 'varchar', length: 20 })
  bossPhone!: string;

  @Column({ name: 'boss_wechat', type: 'varchar', length: 60, nullable: true })
  bossWechat!: string | null;

  @Column({ type: 'varchar', length: 40 })
  industry!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  region!: string | null;

  @Column({ name: 'store_count', type: 'int', default: 1 })
  storeCount!: number;

  // --- 来源 ---
  @Column({ type: 'varchar', length: 20, default: 'other' })
  source!: LeadSource;

  @Column({ name: 'budget_hint', type: 'varchar', length: 20, default: 'unknown' })
  budgetHint!: BudgetHint;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  // --- 状态 ---
  @Column({ type: 'varchar', length: 20, default: 'lead' })
  stage!: CustomerStage;

  @Column({ name: 'health_score', type: 'int', default: 75 })
  healthScore!: number;

  @Column({ name: 'health_level', type: 'varchar', length: 10, default: 'green' })
  healthLevel!: HealthLevel;

  // --- 关系 ---
  @Column({ name: 'pm_id', type: 'varchar', length: 36, nullable: true })
  pmId!: string | null;

  @Column({ name: 'strategist_id', type: 'varchar', length: 36, nullable: true })
  strategistId!: string | null;

  // --- 时间 ---
  @Column({ name: 'last_contact_at', type: 'datetime', nullable: true })
  lastContactAt!: Date | null;

  @Column({ name: 'contract_expires_at', type: 'datetime', nullable: true })
  contractExpiresAt!: Date | null;

  @Column({ name: 'churned_at', type: 'datetime', nullable: true })
  churnedAt!: Date | null;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

/** 合法的状态机跳转（from → to[]）。 */
export const STAGE_TRANSITIONS: Record<CustomerStage, CustomerStage[]> = {
  lead: ['diagnosing', 'churned'],
  diagnosing: ['proposing', 'churned'],
  proposing: ['signed', 'churned'],
  signed: ['delivering', 'churned'],
  delivering: ['reviewing', 'churned', 'renewing'],
  reviewing: ['delivering', 'renewing', 'churned'],
  renewing: ['signed', 'delivering', 'churned'],
  churned: [],
};

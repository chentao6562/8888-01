import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PackageTier = 'starter_pack' | 'monthly_package' | 'annual_partner';

/** 套餐。tenantId=null 表示官方模板；否则为租户私有。 */
@Entity('packages')
@Index(['tenantId', 'tier'])
export class PackageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId!: string | null;

  @Column({ type: 'varchar', length: 30 })
  tier!: PackageTier;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  /** 套餐建议配置，JSON 文本。 */
  @Column({ type: 'text' })
  scope!: string;

  /** 建议报价区间（分）。 */
  @Column({ name: 'price_min', type: 'int' })
  priceMin!: number;

  @Column({ name: 'price_max', type: 'int' })
  priceMax!: number;

  @Column({ name: 'period_months', type: 'int', default: 1 })
  periodMonths!: number;

  @Column({ name: 'target_industries', type: 'text', nullable: true })
  targetIndustries!: string | null; // JSON 数组

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

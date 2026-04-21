import { DATETIME } from '@/common/db/column-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { PackageTier } from './package.entity';

/**
 * 定位书 + 报价 合一实体（data-model §3.3）。一客户可有多版，version 递增。
 */
@Entity('positioning_books')
@Index(['tenantId', 'customerId', 'version'], { unique: true })
export class PositioningBookEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  customerId!: string;

  @Column({ name: 'diagnosis_report_id', type: 'varchar', length: 36, nullable: true })
  diagnosisReportId!: string | null;

  @Column({ type: 'int', default: 1 })
  version!: number;

  /** 一张纸定位（≤ 200 字）。 */
  @Column({ name: 'one_pager', type: 'text', nullable: true })
  onePager!: string | null;

  /** 完整定位书 markdown。 */
  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'package_id', type: 'varchar', length: 36, nullable: true })
  packageId!: string | null;

  @Column({ name: 'plan_tier', type: 'varchar', length: 30 })
  planTier!: PackageTier;

  @Column({ name: 'price_quote', type: 'int', default: 0 })
  priceQuote!: number;

  @Column({ name: 'region_factor', type: 'float', default: 1.0 })
  regionFactor!: number;

  @Column({ name: 'custom_items', type: 'text', nullable: true })
  customItems!: string | null; // JSON: [{name, amount}]

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: 'draft' | 'final' | 'signed';

  @Column({ name: 'signed_at', type: DATETIME, nullable: true })
  signedAt!: Date | null;

  @Column({ name: 'pdf_url', type: 'varchar', length: 500, nullable: true })
  pdfUrl!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

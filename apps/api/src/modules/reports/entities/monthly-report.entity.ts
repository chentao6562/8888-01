import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type MonthlyReportStatus = 'drafting' | 'pending_review' | 'sent' | 'read';

/**
 * 月度报告。每 (customerId, month) 唯一。6 段式结构（PRD §4.6）：
 *  1. 本月总览（流水/到店/ROI）
 *  2. 本月交付物
 *  3. 流量分析
 *  4. 爆款拆解 Top 3
 *  5. 未达标反思
 *  6. 下月重点
 */
@Entity('monthly_reports')
@Index(['tenantId', 'customerId', 'month'], { unique: true })
@Index(['tenantId', 'status'])
export class MonthlyReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  customerId!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 36, nullable: true })
  projectId!: string | null;

  @Column({ type: 'varchar', length: 7 })
  month!: string; // YYYY-MM

  @Column({ type: 'varchar', length: 20, default: 'drafting' })
  status!: MonthlyReportStatus;

  @Column({ name: 'ai_draft', type: 'text', nullable: true })
  aiDraft!: string | null;

  @Column({ name: 'final_content', type: 'text' })
  finalContent!: string;

  /** 6 段结构化数据（便于小程序分页渲染）· JSON */
  @Column({ type: 'text' })
  sections!: string;

  @Column({ name: 'pdf_url', type: 'varchar', length: 500, nullable: true })
  pdfUrl!: string | null;

  @Column({ name: 'h5_url', type: 'varchar', length: 500, nullable: true })
  h5Url!: string | null;

  @Column({ name: 'pushed_at', nullable: true })
  pushedAt!: Date | null;

  @Column({ name: 'read_at', nullable: true })
  readAt!: Date | null;

  @Column({ name: 'drafted_by', type: 'varchar', length: 36, nullable: true })
  draftedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DiagnosisStatus = 'drafting' | 'completed';

/**
 * 诊断报告（对齐 data-model §3.2）。
 * 一客户一诊断（MVP）。
 */
@Entity('diagnosis_reports')
@Index(['tenantId', 'customerId'], { unique: true })
export class DiagnosisReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  customerId!: string;

  @Column({ name: 'strategist_id', type: 'varchar', length: 36, nullable: true })
  strategistId!: string | null;

  // AI 访谈预问卷（mock 内容 + 客户填写答案）
  @Column({ name: 'pre_interview_content', type: 'text', nullable: true })
  preInterviewContent!: string | null;

  @Column({ name: 'pre_interview_answers', type: 'text', nullable: true })
  preInterviewAnswers!: string | null; // JSON

  // 4 把刀问卷
  @Column({ name: 'knife_self', type: 'text', nullable: true })
  knifeSelf!: string | null;

  @Column({ name: 'knife_employee', type: 'text', nullable: true })
  knifeEmployee!: string | null;

  @Column({ name: 'knife_old_customer', type: 'text', nullable: true })
  knifeOldCustomer!: string | null;

  @Column({ name: 'knife_competitor', type: 'text', nullable: true })
  knifeCompetitor!: string | null;

  // 4 张定位卡
  @Column({ name: 'card1_sells', type: 'text', nullable: true })
  card1Sells!: string | null;

  @Column({ name: 'card2_customer_mind', type: 'text', nullable: true })
  card2CustomerMind!: string | null;

  @Column({ name: 'card3_product_video', type: 'text', nullable: true })
  card3ProductVideo!: string | null;

  @Column({ name: 'card4_why_not_next', type: 'text', nullable: true })
  card4WhyNotNext!: string | null;

  // 报告
  @Column({ name: 'report_content', type: 'text', nullable: true })
  reportContent!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'drafting' })
  status!: DiagnosisStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

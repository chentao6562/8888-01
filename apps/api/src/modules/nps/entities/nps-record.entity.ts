import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * NPS 打分。每 (customerId, reportId) 唯一。
 * phase 7 客户端 / 月报阅读完成自动触发。
 */
@Entity('nps_records')
@Index(['tenantId', 'customerId', 'reportId'], { unique: true })
@Index(['tenantId', 'createdAt'])
export class NpsRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  customerId!: string;

  @Column({ name: 'report_id', type: 'varchar', length: 36, nullable: true })
  reportId!: string | null;

  @Column({ type: 'int' })
  score!: number; // 0-10

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column({ name: 'submitted_by', type: 'varchar', length: 36, nullable: true })
  submittedBy!: string | null; // customerUserId / staffId

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

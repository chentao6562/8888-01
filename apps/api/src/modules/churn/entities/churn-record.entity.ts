import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ChurnReason = 'product' | 'price' | 'effect' | 'closure' | 'other';

@Entity('churn_records')
@Index(['tenantId', 'customerId'], { unique: true })
@Index(['tenantId', 'reason'])
export class ChurnRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  customerId!: string;

  @Column({ name: 'renewal_id', type: 'varchar', length: 36, nullable: true })
  renewalId!: string | null;

  @Column({ type: 'varchar', length: 20 })
  reason!: ChurnReason;

  @Column({ name: 'interview_notes', type: 'text', nullable: true })
  interviewNotes!: string | null;

  @Column({ name: 'improvement_suggestion', type: 'text', nullable: true })
  improvementSuggestion!: string | null;

  @Column({ name: 'churned_at', type: 'datetime' })
  churnedAt!: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

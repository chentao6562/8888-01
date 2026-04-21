import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PaymentStage = 'plan' | 'shoot' | 'edit' | 'final';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';

/** 先拍后付分笔 · 20/40/35/5（PRD 附录 C）。 */
@Entity('payments')
@Index(['tenantId', 'contractId'])
@Index(['tenantId', 'status', 'dueAt'])
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'contract_id', type: 'varchar', length: 36 })
  contractId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  customerId!: string;

  @Column({ type: 'varchar', length: 20 })
  stage!: PaymentStage;

  @Column({ type: 'float' })
  ratio!: number;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ name: 'due_at', nullable: true })
  dueAt!: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: PaymentStatus;

  @Column({ name: 'paid_at', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'voucher_url', type: 'varchar', length: 500, nullable: true })
  voucherUrl!: string | null;

  @Column({ name: 'registered_by', type: 'varchar', length: 36, nullable: true })
  registeredBy!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

/** 先拍后付比例 · 对齐 PRD 附录 C。 */
export const PAYMENT_RATIOS: Array<{ stage: PaymentStage; ratio: number }> = [
  { stage: 'plan', ratio: 0.2 },
  { stage: 'shoot', ratio: 0.4 },
  { stage: 'edit', ratio: 0.35 },
  { stage: 'final', ratio: 0.05 },
];

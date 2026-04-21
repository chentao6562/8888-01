import { DATETIME, TINYINT, FLOAT } from '@/common/db/column-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type RenewalStage = 'warning' | 'negotiating' | 'won' | 'lost';

@Entity('renewal_records')
@Index(['tenantId', 'stage'])
@Index(['tenantId', 'customerId'])
export class RenewalRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  customerId!: string;

  @Column({ name: 'original_contract_id', type: 'varchar', length: 36 })
  originalContractId!: string;

  @Column({ name: 'new_contract_id', type: 'varchar', length: 36, nullable: true })
  newContractId!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'warning' })
  stage!: RenewalStage;

  @Column({ name: 'proposal', type: 'text', nullable: true })
  proposal!: string | null;

  @Column({ name: 'discount_ratio', type: FLOAT, nullable: true })
  discountRatio!: number | null;

  @Column({ name: 'expires_at', type: DATETIME })
  expiresAt!: Date;

  @Column({ name: 'lost_reason', type: 'varchar', length: 40, nullable: true })
  lostReason!: string | null; // product / price / effect / closure / other

  @Column({ name: 'lost_analysis', type: 'text', nullable: true })
  lostAnalysis!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

@Entity('negotiation_notes')
@Index(['tenantId', 'renewalId', 'createdAt'])
export class NegotiationNoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'renewal_id', type: 'varchar', length: 36 })
  renewalId!: string;

  @Column({ name: 'staff_id', type: 'varchar', length: 36 })
  staffId!: string;

  @Column({ type: 'varchar', length: 20, default: 'phone' })
  channel!: 'phone' | 'wechat' | 'visit' | 'other';

  @Column({ type: 'text' })
  notes!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type HealthLevel = 'green' | 'yellow' | 'red';

/**
 * 客户健康度月度快照。每 (customerId, month) 唯一。
 * 5 维加权（PRD §4.7.1）：业务 30 · 交付 20 · NPS 20 · 互动 15 · 投诉 15。
 */
@Entity('health_score_snapshots')
@Index(['tenantId', 'customerId', 'month'], { unique: true })
@Index(['tenantId', 'month'])
export class HealthScoreSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  customerId!: string;

  @Column({ type: 'varchar', length: 7 })
  month!: string; // YYYY-MM

  @Column({ name: 'total_score', type: 'int' })
  totalScore!: number;

  @Column({ name: 'business_score', type: 'int', default: 0 })
  businessScore!: number;

  @Column({ name: 'delivery_score', type: 'int', default: 0 })
  deliveryScore!: number;

  @Column({ name: 'nps_score', type: 'int', default: 0 })
  npsScore!: number;

  @Column({ name: 'interaction_score', type: 'int', default: 0 })
  interactionScore!: number;

  @Column({ name: 'complaint_score', type: 'int', default: 0 })
  complaintScore!: number;

  @Column({ type: 'varchar', length: 10 })
  level!: HealthLevel;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

export const HEALTH_WEIGHTS = {
  business: 0.3,
  delivery: 0.2,
  nps: 0.2,
  interaction: 0.15,
  complaint: 0.15,
} as const;

export function toLevel(total: number): HealthLevel {
  if (total >= 85) return 'green';
  if (total >= 60) return 'yellow';
  return 'red';
}

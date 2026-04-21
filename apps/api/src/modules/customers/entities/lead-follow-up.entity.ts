import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type FollowUpChannel = 'call' | 'wechat' | 'visit' | 'email' | 'other';

/** 线索跟进日志。用于 24h 未跟进提醒 + 历史追溯。 */
@Entity('lead_follow_ups')
@Index(['tenantId', 'customerId', 'createdAt'])
export class LeadFollowUpEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  customerId!: string;

  @Column({ name: 'staff_id', type: 'varchar', length: 36 })
  staffId!: string;

  @Column({ type: 'varchar', length: 20, default: 'call' })
  channel!: FollowUpChannel;

  @Column({ type: 'text' })
  notes!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

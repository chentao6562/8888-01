import { DATETIME } from '@/common/db/column-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type StaffRole = 'admin' | 'pm' | 'strategist' | 'creator' | 'adops';
export type StaffStatus = 'invited' | 'active' | 'disabled';

/** 员工。对齐 data-model §2.2。 */
@Entity('staff')
@Index(['tenantId', 'status'])
export class StaffEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36, nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 60 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar!: string | null;

  @Column({ type: 'varchar', length: 20 })
  role!: StaffRole;

  @Column({ type: 'varchar', length: 20, default: 'invited' })
  status!: StaffStatus;

  @Column({ name: 'invite_token', type: 'varchar', length: 120, nullable: true })
  inviteToken!: string | null;

  @Column({ name: 'invite_expires_at', type: DATETIME, nullable: true })
  inviteExpiresAt!: Date | null;

  @Column({ name: 'invited_by', type: 'varchar', length: 36, nullable: true })
  invitedBy!: string | null;

  @Column({ name: 'joined_at', type: DATETIME, nullable: true })
  joinedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

import { DATETIME } from '@/common/db/column-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TaskType = 'plan' | 'shoot' | 'edit' | 'publish' | 'other';
export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'pending_review'
  | 'done'
  | 'rework'
  | 'overdue';

@Entity('tasks')
@Index(['tenantId', 'assigneeId', 'status'])
@Index(['tenantId', 'projectId'])
@Index(['tenantId', 'dueAt'])
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 36 })
  projectId!: string;

  @Column({ name: 'video_id', type: 'varchar', length: 36, nullable: true })
  videoId!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'other' })
  type!: TaskType;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'assignee_id', type: 'varchar', length: 36 })
  assigneeId!: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: TaskStatus;

  @Column({ name: 'due_at', type: DATETIME, nullable: true })
  dueAt!: Date | null;

  @Column({ name: 'completed_at', type: DATETIME, nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'escalated_level', type: 'int', default: 0 })
  escalatedLevel!: number;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ['in_progress', 'overdue'],
  in_progress: ['pending_review', 'overdue', 'rework'],
  pending_review: ['done', 'rework'],
  done: [],
  rework: ['in_progress'],
  overdue: ['in_progress', 'done'],
};

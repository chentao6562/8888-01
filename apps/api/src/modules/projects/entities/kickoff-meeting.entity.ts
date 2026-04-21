import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type KickoffStatus = 'drafting' | 'finalized';

@Entity('kickoff_meetings')
@Index(['tenantId', 'projectId'])
export class KickoffMeetingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 36 })
  projectId!: string;

  @Column({ name: 'meeting_at', type: 'datetime', nullable: true })
  meetingAt!: Date | null;

  /** 5 节议程：目标 / 分工 / 排期 / 风险 / 沟通机制。 */
  @Column({ type: 'text', nullable: true })
  goals!: string | null;

  @Column({ type: 'text', nullable: true })
  roles!: string | null; // JSON: [{role, person, duty}]

  @Column({ type: 'text', nullable: true })
  schedule!: string | null;

  @Column({ type: 'text', nullable: true })
  risks!: string | null; // JSON string[]

  @Column({ name: 'communication_rule', type: 'text', nullable: true })
  communicationRule!: string | null;

  /** 启动会确认的初始任务（finalize 时批量生成 Task）。 */
  @Column({ name: 'initial_tasks', type: 'text', nullable: true })
  initialTasks!: string | null; // JSON: [{title, assigneeRole, dueInDays}]

  @Column({ type: 'varchar', length: 20, default: 'drafting' })
  status!: KickoffStatus;

  @Column({ name: 'pdf_url', type: 'varchar', length: 500, nullable: true })
  pdfUrl!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

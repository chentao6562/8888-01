import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ProjectStatus = 'kickoff' | 'running' | 'at_risk' | 'completed' | 'aborted';
export type ProjectPlan = 'starter_pack' | 'monthly_package' | 'annual_partner';

@Entity('projects')
@Index(['tenantId', 'customerId'])
@Index(['tenantId', 'status'])
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  customerId!: string;

  @Column({ name: 'contract_id', type: 'varchar', length: 36 })
  contractId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 30 })
  plan!: ProjectPlan;

  @Column({ type: 'varchar', length: 20, default: 'kickoff' })
  status!: ProjectStatus;

  @Column({ name: 'start_at', type: 'datetime', nullable: true })
  startAt!: Date | null;

  @Column({ name: 'end_at', type: 'datetime', nullable: true })
  endAt!: Date | null;

  @Column({ name: 'pm_id', type: 'varchar', length: 36, nullable: true })
  pmId!: string | null;

  @Column({ type: 'text', nullable: true })
  goals!: string | null; // JSON: [{metric, targetValue, actualValue, month}]

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

export const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  kickoff: ['running', 'aborted'],
  running: ['at_risk', 'completed', 'aborted'],
  at_risk: ['running', 'completed', 'aborted'],
  completed: [],
  aborted: [],
};

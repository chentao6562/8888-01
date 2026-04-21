import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ContractStatus =
  | 'draft'
  | 'pending_sign'
  | 'signed'
  | 'executing'
  | 'completed'
  | 'renewed'
  | 'terminated';

@Entity('contracts')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'customerId'])
export class ContractEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  customerId!: string;

  @Column({ name: 'proposal_id', type: 'varchar', length: 36, nullable: true })
  proposalId!: string | null;

  @Column({ name: 'template_id', type: 'varchar', length: 36, nullable: true })
  templateId!: string | null;

  @Column({ name: 'project_id', type: 'varchar', length: 36, nullable: true })
  projectId!: string | null;

  @Column({ name: 'contract_no', type: 'varchar', length: 40 })
  contractNo!: string;

  @Column({ name: 'total_amount', type: 'int', default: 0 })
  totalAmount!: number;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: ContractStatus;

  @Column({ name: 'body_snapshot', type: 'text' })
  bodySnapshot!: string;

  @Column({ name: 'variables_snapshot', type: 'text', nullable: true })
  variablesSnapshot!: string | null; // JSON

  @Column({ name: 'signed_at', nullable: true })
  signedAt!: Date | null;

  @Column({ name: 'esign_order_id', type: 'varchar', length: 120, nullable: true })
  esignOrderId!: string | null;

  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl!: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

export const CONTRACT_STATUS_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  draft: ['pending_sign', 'terminated'],
  pending_sign: ['signed', 'draft', 'terminated'],
  signed: ['executing', 'terminated'],
  executing: ['completed', 'terminated'],
  completed: ['renewed'],
  renewed: [],
  terminated: [],
};

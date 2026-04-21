import { DATETIME } from '@/common/db/column-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ComplaintSeverity = 'low' | 'mid' | 'high';
export type ComplaintStatus = 'open' | 'handling' | 'closed';

@Entity('complaints')
@Index(['tenantId', 'customerId'])
@Index(['tenantId', 'status'])
export class ComplaintEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  customerId!: string;

  @Column({ type: 'varchar', length: 10, default: 'mid' })
  severity!: ComplaintSeverity;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status!: ComplaintStatus;

  @Column({ name: 'handled_by', type: 'varchar', length: 36, nullable: true })
  handledBy!: string | null;

  @Column({ name: 'handled_at', type: DATETIME, nullable: true })
  handledAt!: Date | null;

  @Column({ name: 'resolution', type: 'text', nullable: true })
  resolution!: string | null;

  @Column({ name: 'source', type: 'varchar', length: 20, default: 'pm' })
  source!: 'pm' | 'customer';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

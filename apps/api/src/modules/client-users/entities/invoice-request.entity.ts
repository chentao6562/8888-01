import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type InvoiceStatus = 'pending' | 'issued' | 'rejected';

@Entity('invoice_requests')
@Index(['tenantId', 'customerId'])
@Index(['tenantId', 'status'])
export class InvoiceRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  customerId!: string;

  @Column({ name: 'contract_id', type: 'varchar', length: 36, nullable: true })
  contractId!: string | null;

  @Column({ name: 'payment_ids', type: 'text', nullable: true })
  paymentIds!: string | null; // JSON string[]

  @Column({ name: 'invoice_title', type: 'varchar', length: 200 })
  invoiceTitle!: string;

  @Column({ name: 'tax_id', type: 'varchar', length: 30, nullable: true })
  taxId!: string | null;

  @Column({ name: 'invoice_type', type: 'varchar', length: 20, default: 'general' })
  invoiceType!: 'general' | 'special';

  @Column({ name: 'mail_address', type: 'varchar', length: 400, nullable: true })
  mailAddress!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: InvoiceStatus;

  @Column({ name: 'issued_at', nullable: true })
  issuedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { PackageTier } from '@/modules/proposals/entities/package.entity';

/**
 * 合同模板。tenantId=null 表示官方；否则租户私有。
 * body 是 markdown 模板，变量使用 {{companyName}} / {{totalAmount}} 等占位。
 */
@Entity('contract_templates')
@Index(['tenantId', 'tier'])
export class ContractTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId!: string | null;

  @Column({ type: 'varchar', length: 30 })
  tier!: PackageTier;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text' })
  body!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

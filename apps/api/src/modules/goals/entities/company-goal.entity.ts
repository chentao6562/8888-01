import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('company_goals')
@Index(['tenantId', 'month'], { unique: true })
export class CompanyGoalEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 7 })
  month!: string; // YYYY-MM

  @Column({ name: 'new_customers', type: 'int', default: 0 })
  newCustomers!: number;

  @Column({ name: 'renewal_customers', type: 'int', default: 0 })
  renewalCustomers!: number;

  @Column({ name: 'churn_red_line', type: 'int', default: 3 })
  churnRedLine!: number;

  @Column({ name: 'target_revenue', type: 'int', default: 0 })
  targetRevenue!: number; // 分

  @Column({ name: 'target_arpu', type: 'int', default: 0 })
  targetArpu!: number; // 分

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

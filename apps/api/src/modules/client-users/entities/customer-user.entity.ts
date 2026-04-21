import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** 客户老板的登录凭证。phase 7 起启用。 */
@Entity('customer_users')
@Index(['tenantId', 'customerId'], { unique: true })
@Index(['openid'], { unique: false })
export class CustomerUserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  customerId!: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  openid!: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  unionid!: string | null;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ name: 'login_count', type: 'int', default: 0 })
  loginCount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

import { TINYINT, FLOAT } from '@/common/db/column-types';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('llm_usage_logs')
@Index(['tenantId', 'createdAt'])
export class LlmUsageLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'staff_id', type: 'varchar', length: 36, nullable: true })
  staffId!: string | null;

  @Column({ name: 'prompt_name', type: 'varchar', length: 60 })
  promptName!: string;

  @Column({ type: 'varchar', length: 40 })
  provider!: string;

  @Column({ name: 'tokens_in', type: 'int', default: 0 })
  tokensIn!: number;

  @Column({ name: 'tokens_out', type: 'int', default: 0 })
  tokensOut!: number;

  @Column({ name: 'latency_ms', type: 'int', default: 0 })
  latencyMs!: number;

  @Column({ type: TINYINT, default: 1 })
  success!: number;

  @Column({ name: 'error_code', type: 'varchar', length: 60, nullable: true })
  errorCode!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CaseCategory = 'copy' | 'scene' | 'bgm' | 'title' | 'tag' | 'campaign';
export type CaseFreshness = 'fresh' | 'aging' | 'stale';

/**
 * 案例库实体。tenantId=null 表示官方库（phase 4 不填充）。
 * phase 4 MVP：支持文案 / 标题 两类；其他类别字段就位但 UI 暂不开放。
 */
@Entity('cases')
@Index(['tenantId', 'category'])
export class CaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId!: string | null;

  @Column({ type: 'varchar', length: 20 })
  category!: CaseCategory;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'video_ref', type: 'varchar', length: 36, nullable: true })
  videoRef!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  industry!: string | null;

  @Column({ type: 'text', nullable: true })
  metrics!: string | null; // JSON: { plays?, roi?, ctr? }

  @Column({ type: 'text', nullable: true })
  tags!: string | null; // JSON string[]

  @Column({ name: 'call_count', type: 'int', default: 0 })
  callCount!: number;

  @Column({ name: 'last_called_at', nullable: true })
  lastCalledAt!: Date | null;

  @Column({ type: 'varchar', length: 10, default: 'fresh' })
  freshness!: CaseFreshness;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

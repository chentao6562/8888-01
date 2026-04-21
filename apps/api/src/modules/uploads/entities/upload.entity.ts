import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type UploadKind = 'image' | 'audio' | 'video' | 'doc' | 'other';

/**
 * 上传元数据。MVP 本地磁盘存储（uploads/），phase 8 换 COS/OSS。
 */
@Entity('uploads')
@Index(['tenantId', 'ownerType', 'ownerId'])
export class UploadEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'owner_type', type: 'varchar', length: 40, nullable: true })
  ownerType!: string | null;

  @Column({ name: 'owner_id', type: 'varchar', length: 36, nullable: true })
  ownerId!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'other' })
  kind!: UploadKind;

  @Column({ type: 'varchar', length: 255 })
  filename!: string;

  @Column({ type: 'varchar', length: 120 })
  mimetype!: string;

  @Column({ type: 'int', default: 0 })
  size!: number;

  @Column({ type: 'varchar', length: 500 })
  url!: string;

  @Column({ name: 'uploaded_by', type: 'varchar', length: 36, nullable: true })
  uploadedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

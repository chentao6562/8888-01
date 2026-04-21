import { TINYINT, FLOAT } from '@/common/db/column-types';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 客户端成片审核时对视频时间轴的打点批注。 */
@Entity('video_comments')
@Index(['tenantId', 'videoId', 'createdAt'])
export class VideoCommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'video_id', type: 'varchar', length: 36 })
  videoId!: string;

  @Column({ name: 'customer_user_id', type: 'varchar', length: 36, nullable: true })
  customerUserId!: string | null;

  @Column({ type: 'varchar', length: 60 })
  author!: string;

  @Column({ type: FLOAT, default: 0 })
  timestamp!: number; // 视频秒数

  @Column({ type: 'text' })
  text!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

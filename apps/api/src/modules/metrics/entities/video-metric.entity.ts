import { TINYINT, FLOAT } from '@/common/db/column-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 视频单平台某日数据。按 (video_id, platform, date) 唯一。
 * MVP 手工录入，phase 对接开放平台归 V2。
 */
@Entity('video_metrics')
@Index(['tenantId', 'videoId', 'platform', 'date'], { unique: true })
@Index(['tenantId', 'date'])
export class VideoMetricEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'video_id', type: 'varchar', length: 36 })
  videoId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  customerId!: string;

  @Column({ type: 'varchar', length: 20 })
  platform!: string; // 抖音 / 视频号 / 小红书 / 快手

  @Column({ type: 'varchar', length: 10 })
  date!: string; // YYYY-MM-DD

  @Column({ type: 'int', default: 0 })
  plays!: number;

  @Column({ type: 'int', default: 0 })
  likes!: number;

  @Column({ type: 'int', default: 0 })
  comments!: number;

  @Column({ type: 'int', default: 0 })
  shares!: number;

  @Column({ type: 'int', default: 0 })
  collections!: number;

  @Column({ name: 'ad_spend', type: 'int', default: 0 })
  adSpend!: number; // 分

  @Column({ type: FLOAT, default: 0 })
  roi!: number;

  @Column({ name: 'entered_by', type: 'varchar', length: 36, nullable: true })
  enteredBy!: string | null;

  @Column({ name: 'anomaly_flag', type: TINYINT, default: 0 })
  anomalyFlag!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

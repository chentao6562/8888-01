import { DATETIME } from '@/common/db/column-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type VideoStatus =
  | 'planning'
  | 'shooting'
  | 'editing'
  | 'pending_review'
  | 'approved'
  | 'minor_change'
  | 'reshoot'
  | 'pending_publish'
  | 'published'
  | 'offline';

@Entity('videos')
@Index(['tenantId', 'projectId', 'status'])
@Index(['tenantId', 'customerId'])
export class VideoEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId!: string;

  @Column({ name: 'project_id', type: 'varchar', length: 36 })
  projectId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  customerId!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  script!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'planning' })
  status!: VideoStatus;

  // 角色归属（每个环节的负责人）
  @Column({ name: 'strategist_id', type: 'varchar', length: 36, nullable: true })
  strategistId!: string | null;

  @Column({ name: 'creator_id', type: 'varchar', length: 36, nullable: true })
  creatorId!: string | null;

  @Column({ name: 'editor_id', type: 'varchar', length: 36, nullable: true })
  editorId!: string | null;

  @Column({ name: 'adops_id', type: 'varchar', length: 36, nullable: true })
  adopsId!: string | null;

  // 素材（JSON 数组 URL）
  @Column({ name: 'raw_material_urls', type: 'text', nullable: true })
  rawMaterialUrls!: string | null;

  @Column({ name: 'draft_video_url', type: 'varchar', length: 500, nullable: true })
  draftVideoUrl!: string | null;

  @Column({ name: 'final_video_url', type: 'varchar', length: 500, nullable: true })
  finalVideoUrl!: string | null;

  @Column({ name: 'cover_url', type: 'varchar', length: 500, nullable: true })
  coverUrl!: string | null;

  // 文案
  @Column({ type: 'text', nullable: true })
  copywriting!: string | null;

  @Column({ type: 'text', nullable: true })
  titles!: string | null; // JSON string[]

  @Column({ type: 'text', nullable: true })
  tags!: string | null; // JSON string[]

  // 审核（phase 7 激活完整流）
  @Column({ name: 'review_submitted_at', type: DATETIME, nullable: true })
  reviewSubmittedAt!: Date | null;

  @Column({ name: 'reviewed_at', type: DATETIME, nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

export const VIDEO_STATUS_TRANSITIONS: Record<VideoStatus, VideoStatus[]> = {
  planning: ['shooting', 'offline'],
  shooting: ['editing', 'reshoot', 'offline'],
  editing: ['pending_review', 'offline'],
  pending_review: ['approved', 'minor_change', 'reshoot'],
  minor_change: ['editing'],
  reshoot: ['planning', 'shooting'],
  approved: ['pending_publish'],
  pending_publish: ['published'],
  published: ['offline'],
  offline: [],
};

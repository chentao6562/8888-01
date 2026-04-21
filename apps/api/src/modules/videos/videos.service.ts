import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  VIDEO_STATUS_TRANSITIONS,
  VideoEntity,
  VideoStatus,
} from './entities/video.entity';

export interface CreateVideoInput {
  projectId: string;
  customerId: string;
  title: string;
  script?: string;
  strategistId?: string | null;
}

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(VideoEntity)
    private readonly repo: Repository<VideoEntity>,
  ) {}

  async list(
    tenantId: string,
    filters: { projectId?: string; status?: VideoStatus } = {},
  ): Promise<VideoEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.status) where.status = filters.status;
    return this.repo.find({ where, order: { updatedAt: 'DESC' } });
  }

  async findById(tenantId: string, id: string): Promise<VideoEntity> {
    const v = await this.repo.findOne({ where: { tenantId, id } });
    if (!v) throw new NotFoundException({ code: 'VIDEO_NOT_FOUND', message: '视频不存在' });
    return v;
  }

  async create(tenantId: string, input: CreateVideoInput): Promise<VideoEntity> {
    const v = this.repo.create({
      tenantId,
      projectId: input.projectId,
      customerId: input.customerId,
      title: input.title,
      script: input.script ?? null,
      strategistId: input.strategistId ?? null,
      status: 'planning',
    });
    return this.repo.save(v);
  }

  async update(
    tenantId: string,
    id: string,
    patch: Partial<VideoEntity>,
  ): Promise<VideoEntity> {
    const v = await this.findById(tenantId, id);
    const forbidden = new Set(['id', 'tenantId', 'status', 'createdAt', 'updatedAt']);
    for (const [k, value] of Object.entries(patch)) {
      if (forbidden.has(k)) continue;
      (v as unknown as Record<string, unknown>)[k] = value;
    }
    return this.repo.save(v);
  }

  async transition(tenantId: string, id: string, to: VideoStatus): Promise<VideoEntity> {
    const v = await this.findById(tenantId, id);
    const allowed = VIDEO_STATUS_TRANSITIONS[v.status];
    if (!allowed.includes(to)) {
      throw new ConflictException({
        code: 'VIDEO_INVALID_STATUS_TRANSITION',
        message: `不能从 ${v.status} 跳到 ${to}`,
      });
    }
    v.status = to;
    if (to === 'pending_review') v.reviewSubmittedAt = new Date();
    return this.repo.save(v);
  }

  async addRawMaterial(
    tenantId: string,
    id: string,
    url: string,
  ): Promise<VideoEntity> {
    const v = await this.findById(tenantId, id);
    const list = v.rawMaterialUrls ? (JSON.parse(v.rawMaterialUrls) as string[]) : [];
    list.push(url);
    v.rawMaterialUrls = JSON.stringify(list);
    return this.repo.save(v);
  }

  async setFinalUrl(
    tenantId: string,
    id: string,
    url: string,
  ): Promise<VideoEntity> {
    const v = await this.findById(tenantId, id);
    v.finalVideoUrl = url;
    return this.repo.save(v);
  }

  async submitForReview(tenantId: string, id: string): Promise<VideoEntity> {
    return this.transition(tenantId, id, 'pending_review');
  }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadEntity, UploadKind } from './entities/upload.entity';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import * as path from 'path';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const MAX_SIZES: Record<UploadKind, number> = {
  image: 10 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  video: 500 * 1024 * 1024,
  doc: 20 * 1024 * 1024,
  other: 10 * 1024 * 1024,
};

/**
 * MIME 严格白名单。Phase 8 OSS 迁移时再加 magic-byte 校验（用 file-type 包）。
 * 当前阶段：拒绝白名单外类型 + 大小硬限 + 拒空文件。
 */
const ALLOWED_MIMES = new Set<string>([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-m4a',
  'video/mp4',
  'video/quicktime',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]);

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(UploadEntity)
    private readonly repo: Repository<UploadEntity>,
  ) {
    if (!existsSync(UPLOAD_ROOT)) mkdirSync(UPLOAD_ROOT, { recursive: true });
  }

  async save(
    tenantId: string,
    uploadedBy: string,
    file: Express.Multer.File,
    meta: { kind?: UploadKind; ownerType?: string; ownerId?: string } = {},
  ): Promise<UploadEntity> {
    if (!file.size || file.size === 0) {
      throw new BadRequestException({ code: 'UPLOAD_EMPTY', message: '文件不能为空' });
    }
    if (!file.mimetype || !ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException({
        code: 'UPLOAD_MIME_NOT_ALLOWED',
        message: `不支持的文件类型 ${file.mimetype}`,
      });
    }
    const kind = meta.kind ?? this.inferKind(file.mimetype);
    if (file.size > MAX_SIZES[kind]) {
      throw new BadRequestException({
        code: 'UPLOAD_TOO_LARGE',
        message: `文件超过 ${kind} 类型上限`,
      });
    }
    const tenantDir = path.join(UPLOAD_ROOT, tenantId);
    if (!existsSync(tenantDir)) mkdirSync(tenantDir, { recursive: true });
    const safeName = `${Date.now()}-${randomBytes(6).toString('hex')}-${sanitize(file.originalname)}`;
    const absPath = path.join(tenantDir, safeName);
    writeFileSync(absPath, file.buffer);

    const url = `/uploads/${tenantId}/${safeName}`;
    const row = this.repo.create({
      tenantId,
      kind,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url,
      ownerType: meta.ownerType ?? null,
      ownerId: meta.ownerId ?? null,
      uploadedBy,
    });
    return this.repo.save(row);
  }

  async listByOwner(tenantId: string, ownerType: string, ownerId: string): Promise<UploadEntity[]> {
    return this.repo.find({
      where: { tenantId, ownerType, ownerId },
      order: { createdAt: 'ASC' },
    });
  }

  private inferKind(mime: string): UploadKind {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.startsWith('video/')) return 'video';
    if (
      mime === 'application/pdf' ||
      mime.startsWith('application/msword') ||
      mime.includes('wordprocessingml') ||
      mime.includes('spreadsheetml') ||
      mime.startsWith('text/')
    )
      return 'doc';
    return 'other';
  }
}

function sanitize(name: string): string {
  return name.replace(/[^\w.\-一-龥]+/g, '_').slice(0, 60);
}

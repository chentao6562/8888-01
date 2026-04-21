import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoEntity } from '@/modules/videos/entities/video.entity';
import { VideosService } from '@/modules/videos/videos.service';

export interface TeleprompterSegment {
  index: number;
  text: string;
  /** 预估秒数（粗估：中文 4 字 / 秒） */
  estimatedSeconds: number;
}

export interface TeleprompterScript {
  videoId: string;
  title: string;
  script: string;
  segments: TeleprompterSegment[];
  totalSeconds: number;
}

@Injectable()
export class TeleprompterService {
  constructor(
    @InjectRepository(VideoEntity)
    private readonly videos: Repository<VideoEntity>,
    private readonly videosSvc: VideosService,
  ) {}

  async get(tenantId: string, videoId: string): Promise<TeleprompterScript> {
    const v = await this.videosSvc.findById(tenantId, videoId);
    const script = v.script ?? '';
    const segments = this.split(script);
    const total = segments.reduce((s, seg) => s + seg.estimatedSeconds, 0);
    return {
      videoId: v.id,
      title: v.title,
      script,
      segments,
      totalSeconds: total,
    };
  }

  /**
   * 上传某一段的录音 URL（phase 7 小程序端真实接入时用）。
   * 现阶段存到 video 的 rawMaterialUrls 里，并带 `[seg:index]` 前缀 tag。
   */
  async uploadSegment(
    tenantId: string,
    videoId: string,
    segmentIndex: number,
    url: string,
  ): Promise<VideoEntity> {
    const v = await this.videosSvc.findById(tenantId, videoId);
    const list: string[] = v.rawMaterialUrls ? (JSON.parse(v.rawMaterialUrls) as string[]) : [];
    list.push(`[seg:${segmentIndex}] ${url}`);
    v.rawMaterialUrls = JSON.stringify(list);
    return this.videos.save(v);
  }

  /** 简单按句分段。中文按 。！? 换行符切。 */
  private split(script: string): TeleprompterSegment[] {
    if (!script) return [];
    const raw = script
      .split(/(?<=[。！?\n])/)
      .map((s) => s.trim())
      .filter(Boolean);
    return raw.map((text, index) => ({
      index,
      text,
      estimatedSeconds: Math.max(2, Math.round([...text].length / 4)),
    }));
  }
}

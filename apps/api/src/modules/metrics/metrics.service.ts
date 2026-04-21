import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, Repository } from 'typeorm';
import { VideoMetricEntity } from './entities/video-metric.entity';
import { VideoEntity } from '@/modules/videos/entities/video.entity';

export interface MetricInput {
  videoId: string;
  platform: string;
  date: string; // YYYY-MM-DD
  plays?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  collections?: number;
  adSpend?: number;
  roi?: number;
}

@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(VideoMetricEntity)
    private readonly repo: Repository<VideoMetricEntity>,
    @InjectRepository(VideoEntity)
    private readonly videos: Repository<VideoEntity>,
  ) {}

  async upsert(
    tenantId: string,
    enteredBy: string,
    input: MetricInput,
  ): Promise<VideoMetricEntity> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'date 必须是 YYYY-MM-DD 格式',
      });
    }
    const video = await this.videos.findOne({
      where: { tenantId, id: input.videoId },
    });
    if (!video) {
      throw new BadRequestException({
        code: 'VIDEO_NOT_FOUND',
        message: '视频不存在',
      });
    }
    let row = await this.repo.findOne({
      where: {
        tenantId,
        videoId: input.videoId,
        platform: input.platform,
        date: input.date,
      },
    });
    if (!row) {
      row = this.repo.create({
        tenantId,
        videoId: input.videoId,
        customerId: video.customerId,
        platform: input.platform,
        date: input.date,
        enteredBy,
      });
    }
    row.plays = input.plays ?? row.plays ?? 0;
    row.likes = input.likes ?? row.likes ?? 0;
    row.comments = input.comments ?? row.comments ?? 0;
    row.shares = input.shares ?? row.shares ?? 0;
    row.collections = input.collections ?? row.collections ?? 0;
    row.adSpend = input.adSpend ?? row.adSpend ?? 0;
    row.roi = input.roi ?? row.roi ?? 0;
    return this.repo.save(row);
  }

  async bulkImport(
    tenantId: string,
    enteredBy: string,
    rows: MetricInput[],
  ): Promise<{ inserted: number; errors: Array<{ row: number; message: string }> }> {
    const errors: Array<{ row: number; message: string }> = [];
    let inserted = 0;
    for (let i = 0; i < rows.length; i++) {
      try {
        await this.upsert(tenantId, enteredBy, rows[i]);
        inserted++;
      } catch (e) {
        errors.push({ row: i, message: (e as Error).message });
      }
    }
    return { inserted, errors };
  }

  async listByVideo(tenantId: string, videoId: string): Promise<VideoMetricEntity[]> {
    return this.repo.find({
      where: { tenantId, videoId },
      order: { date: 'DESC' },
    });
  }

  async listByCustomer(
    tenantId: string,
    customerId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<VideoMetricEntity[]> {
    const where: Record<string, unknown> = { tenantId, customerId };
    if (fromDate && toDate) where.date = Between(fromDate, toDate);
    return this.repo.find({ where, order: { date: 'DESC' } });
  }

  /**
   * 简单异常检测：某视频当天 plays 环比前 3 天平均 < 50% → 标 anomaly。
   */
  async scanAnomalies(tenantId: string): Promise<VideoMetricEntity[]> {
    const recent = await this.repo.find({
      where: { tenantId },
      order: { date: 'DESC' },
      take: 500,
    });
    const byVideo = new Map<string, VideoMetricEntity[]>();
    for (const r of recent) {
      const list = byVideo.get(r.videoId) ?? [];
      list.push(r);
      byVideo.set(r.videoId, list);
    }
    const anomalies: VideoMetricEntity[] = [];
    for (const [, rows] of byVideo) {
      rows.sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 3; i < rows.length; i++) {
        const recentAvg =
          (rows[i - 3].plays + rows[i - 2].plays + rows[i - 1].plays) / 3 || 1;
        if (rows[i].plays < recentAvg * 0.5 && !rows[i].anomalyFlag) {
          rows[i].anomalyFlag = 1;
          await this.repo.save(rows[i]);
          anomalies.push(rows[i]);
        }
      }
    }
    return anomalies;
  }

  /** 月度聚合：视频 × 平台加总，为月报引擎使用 */
  async monthlyAggregate(
    tenantId: string,
    customerId: string,
    month: string, // YYYY-MM
  ): Promise<{
    totalPlays: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalAdSpend: number;
    avgRoi: number;
    byVideo: Array<{ videoId: string; plays: number; roi: number }>;
  }> {
    const start = `${month}-01`;
    const end = `${month}-31`;
    const rows = await this.repo.find({
      where: { tenantId, customerId, date: Between(start, end) },
    });
    let plays = 0, likes = 0, comments = 0, shares = 0, adSpend = 0;
    const videoMap = new Map<string, { plays: number; roi: number; count: number }>();
    for (const r of rows) {
      plays += r.plays;
      likes += r.likes;
      comments += r.comments;
      shares += r.shares;
      adSpend += r.adSpend;
      const cur = videoMap.get(r.videoId) ?? { plays: 0, roi: 0, count: 0 };
      cur.plays += r.plays;
      cur.roi += r.roi;
      cur.count++;
      videoMap.set(r.videoId, cur);
    }
    const byVideo = [...videoMap.entries()]
      .map(([videoId, v]) => ({
        videoId,
        plays: v.plays,
        roi: v.count ? v.roi / v.count : 0,
      }))
      .sort((a, b) => b.plays - a.plays);
    const totalRoi = rows.reduce((s, r) => s + r.roi, 0);
    return {
      totalPlays: plays,
      totalLikes: likes,
      totalComments: comments,
      totalShares: shares,
      totalAdSpend: adSpend,
      avgRoi: rows.length ? totalRoi / rows.length : 0,
      byVideo,
    };
  }
}

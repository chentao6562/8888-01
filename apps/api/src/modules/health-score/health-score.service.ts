import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  HEALTH_WEIGHTS,
  HealthScoreSnapshotEntity,
  toLevel,
} from './entities/health-score-snapshot.entity';
import { MetricsService } from '@/modules/metrics/metrics.service';
import { NpsService } from '@/modules/nps/nps.service';
import { ComplaintsService } from '@/modules/complaints/complaints.service';
import { CustomersService } from '@/modules/customers/customers.service';
import { TaskEntity } from '@/modules/tasks/entities/task.entity';
import { VideoEntity } from '@/modules/videos/entities/video.entity';
import { Between } from 'typeorm';

@Injectable()
export class HealthScoreService {
  constructor(
    @InjectRepository(HealthScoreSnapshotEntity)
    private readonly snapshots: Repository<HealthScoreSnapshotEntity>,
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
    @InjectRepository(VideoEntity)
    private readonly videos: Repository<VideoEntity>,
    private readonly metrics: MetricsService,
    private readonly nps: NpsService,
    private readonly complaints: ComplaintsService,
    private readonly customers: CustomersService,
  ) {}

  async calculate(
    tenantId: string,
    customerId: string,
    month: string,
  ): Promise<HealthScoreSnapshotEntity> {
    // 各维度计算（对齐 PRD §4.7.1）
    const business = await this.businessScore(tenantId, customerId, month);
    const delivery = await this.deliveryScore(tenantId, customerId, month);
    const nps = await this.nps.monthlyAvgScoreNormalized(tenantId, customerId, month);
    const interaction = await this.interactionScore(tenantId, customerId, month);
    const complaintPenalty = await this.complaints.monthlyPenalty(
      tenantId,
      customerId,
      month,
    );
    const complaint = Math.max(0, 100 - complaintPenalty);

    const total = Math.round(
      business * HEALTH_WEIGHTS.business +
        delivery * HEALTH_WEIGHTS.delivery +
        nps * HEALTH_WEIGHTS.nps +
        interaction * HEALTH_WEIGHTS.interaction +
        complaint * HEALTH_WEIGHTS.complaint,
    );

    const level = toLevel(total);

    // upsert snapshot
    let row = await this.snapshots.findOne({
      where: { tenantId, customerId, month },
    });
    if (!row) {
      row = this.snapshots.create({ tenantId, customerId, month });
    }
    row.businessScore = business;
    row.deliveryScore = delivery;
    row.npsScore = nps;
    row.interactionScore = interaction;
    row.complaintScore = complaint;
    row.totalScore = total;
    row.level = level;
    const saved = await this.snapshots.save(row);

    // 回写客户最新 healthScore
    await this.customers.update(tenantId, customerId, {
      healthScore: total,
      healthLevel: level,
    });

    return saved;
  }

  async history(
    tenantId: string,
    customerId: string,
  ): Promise<HealthScoreSnapshotEntity[]> {
    return this.snapshots.find({
      where: { tenantId, customerId },
      order: { month: 'DESC' },
      take: 12,
    });
  }

  async currentOrRecalc(
    tenantId: string,
    customerId: string,
  ): Promise<HealthScoreSnapshotEntity> {
    const month = currentMonth();
    const existing = await this.snapshots.findOne({
      where: { tenantId, customerId, month },
    });
    if (existing) return existing;
    return this.calculate(tenantId, customerId, month);
  }

  // ===== 各维度子算法 =====

  private async businessScore(
    tenantId: string,
    customerId: string,
    month: string,
  ): Promise<number> {
    // 本月流水目标达成率（暂用 metrics 的 totalAdSpend + avgRoi 粗估）
    const agg = await this.metrics.monthlyAggregate(tenantId, customerId, month);
    if (agg.byVideo.length === 0) return 75; // 数据不足默认 75（黄灯边缘）
    // ROI ≥ 1.0 得 100；ROI 0.5 得 60；ROI < 0.5 得 30
    const r = agg.avgRoi;
    if (r >= 1.5) return 100;
    if (r >= 1) return 90;
    if (r >= 0.5) return 65;
    return 40;
  }

  private async deliveryScore(
    tenantId: string,
    customerId: string,
    month: string,
  ): Promise<number> {
    const start = new Date(`${month}-01T00:00:00Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const tasks = await this.tasks.find({
      where: { tenantId, createdAt: Between(start, end) },
    });
    if (tasks.length === 0) return 80;
    const onTime = tasks.filter((t) => t.status === 'done' && t.escalatedLevel === 0).length;
    const overdue = tasks.filter((t) => t.status === 'overdue' || t.escalatedLevel > 0).length;
    const rate = onTime / Math.max(1, onTime + overdue);
    return Math.max(0, Math.round(rate * 100));
  }

  private async interactionScore(
    tenantId: string,
    customerId: string,
    _month: string,
  ): Promise<number> {
    // phase 7 客户端埋点后会更准。现阶段用 lastContactAt 近 30 天有记录=满分
    const customer = await this.customers.findById(tenantId, customerId);
    if (!customer?.lastContactAt) return 60;
    const daysSince = Math.floor(
      (Date.now() - customer.lastContactAt.getTime()) / 86400_000,
    );
    if (daysSince <= 7) return 100;
    if (daysSince <= 14) return 80;
    if (daysSince <= 30) return 60;
    return 30;
  }
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

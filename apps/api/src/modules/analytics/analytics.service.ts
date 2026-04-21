import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricsService } from '@/modules/metrics/metrics.service';
import { VideoEntity } from '@/modules/videos/entities/video.entity';
import { CustomerEntity } from '@/modules/customers/entities/customer.entity';
import { ContractEntity } from '@/modules/contracts/entities/contract.entity';
import { PaymentEntity } from '@/modules/contracts/entities/payment.entity';
import { TaskEntity } from '@/modules/tasks/entities/task.entity';
import { Between } from 'typeorm';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(VideoEntity)
    private readonly videos: Repository<VideoEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customers: Repository<CustomerEntity>,
    @InjectRepository(ContractEntity)
    private readonly contracts: Repository<ContractEntity>,
    @InjectRepository(PaymentEntity)
    private readonly payments: Repository<PaymentEntity>,
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
    private readonly metrics: MetricsService,
  ) {}

  /** 项目层：视频 ROI + Top 3 + 趋势 */
  async project(tenantId: string, projectId: string) {
    const videos = await this.videos.find({ where: { tenantId, projectId } });
    const byVideo = [];
    for (const v of videos) {
      const metrics = await this.metrics.listByVideo(tenantId, v.id);
      const plays = metrics.reduce((s, m) => s + m.plays, 0);
      const adSpend = metrics.reduce((s, m) => s + m.adSpend, 0);
      const roi = metrics.length ? metrics.reduce((s, m) => s + m.roi, 0) / metrics.length : 0;
      byVideo.push({ videoId: v.id, title: v.title, plays, adSpend, roi });
    }
    byVideo.sort((a, b) => b.plays - a.plays);
    return {
      projectId,
      videoCount: videos.length,
      top3: byVideo.slice(0, 3),
      allVideos: byVideo,
    };
  }

  /** 客户层：KPI + 近 6 月趋势 */
  async customer(tenantId: string, customerId: string) {
    const customer = await this.customers.findOne({ where: { tenantId, id: customerId } });
    const now = new Date();
    const months: Array<{ month: string; plays: number; roi: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const agg = await this.metrics.monthlyAggregate(tenantId, customerId, month);
      months.push({
        month,
        plays: agg.totalPlays,
        roi: Number(agg.avgRoi.toFixed(2)),
      });
    }
    return {
      customer: customer
        ? {
            id: customer.id,
            name: customer.companyName,
            healthScore: customer.healthScore,
            healthLevel: customer.healthLevel,
            stage: customer.stage,
          }
        : null,
      trend: months,
    };
  }

  /** 公司层：全公司 KPI + 漏斗 */
  async company(tenantId: string) {
    const [
      totalCustomers,
      activeCustomers,
      byStage,
      totalContracts,
      signedContracts,
      thisMonthPayments,
      overdueTasks,
    ] = await Promise.all([
      this.customers.count({ where: { tenantId } }),
      this.customers.createQueryBuilder('c')
        .where('c.tenantId = :tid', { tid: tenantId })
        .andWhere('c.stage IN (:...stages)', {
          stages: ['delivering', 'reviewing', 'renewing'],
        })
        .getCount(),
      this.customers.createQueryBuilder('c')
        .select('c.stage', 'stage')
        .addSelect('COUNT(*)', 'count')
        .where('c.tenantId = :tid', { tid: tenantId })
        .groupBy('c.stage')
        .getRawMany<{ stage: string; count: string }>(),
      this.contracts.count({ where: { tenantId } }),
      this.contracts.createQueryBuilder('c')
        .where('c.tenantId = :tid', { tid: tenantId })
        .andWhere('c.status IN (:...st)', { st: ['signed', 'executing', 'completed'] })
        .getCount(),
      this.thisMonthIncome(tenantId),
      this.tasks.count({ where: { tenantId, status: 'overdue' } }),
    ]);

    const stageMap: Record<string, number> = {};
    for (const r of byStage) stageMap[r.stage] = Number(r.count);

    return {
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        byStage: stageMap,
      },
      contracts: {
        total: totalContracts,
        signed: signedContracts,
      },
      thisMonth: {
        incomeCents: thisMonthPayments,
      },
      tasks: {
        overdue: overdueTasks,
      },
    };
  }

  private async thisMonthIncome(tenantId: string): Promise<number> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const paid = await this.payments.find({
      where: { tenantId, status: 'paid', paidAt: Between(start, end) },
    });
    return paid.reduce((s, p) => s + p.amount, 0);
  }
}

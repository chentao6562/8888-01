import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MonthlyReportEntity,
  MonthlyReportStatus,
} from './entities/monthly-report.entity';
import { LlmService } from '@/modules/llm/llm.service';
import { MetricsService } from '@/modules/metrics/metrics.service';
import { CustomersService } from '@/modules/customers/customers.service';
import { NpsService } from '@/modules/nps/nps.service';

export interface MonthlySections {
  overview: { plays: number; roi: number; adSpend: number };
  deliverables: { videoCount: number; topPlays: number };
  trafficAnalysis: string;
  topVideos: Array<{ videoId: string; plays: number; roi: number }>;
  missed: string;
  nextMonthFocus: string[];
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(MonthlyReportEntity)
    private readonly repo: Repository<MonthlyReportEntity>,
    private readonly llm: LlmService,
    private readonly metrics: MetricsService,
    private readonly customers: CustomersService,
    private readonly nps: NpsService,
  ) {}

  async list(tenantId: string, filters: { customerId?: string; status?: MonthlyReportStatus } = {}) {
    const where: Record<string, unknown> = { tenantId };
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.status) where.status = filters.status;
    return this.repo.find({ where, order: { month: 'DESC' } });
  }

  async findById(tenantId: string, id: string): Promise<MonthlyReportEntity> {
    const row = await this.repo.findOne({ where: { tenantId, id } });
    if (!row) {
      throw new NotFoundException({ code: 'REPORT_NOT_FOUND', message: '月报不存在' });
    }
    return row;
  }

  async findByCustomerMonth(
    tenantId: string,
    customerId: string,
    month: string,
  ): Promise<MonthlyReportEntity | null> {
    return this.repo.findOne({ where: { tenantId, customerId, month } });
  }

  /**
   * 基于 metrics 聚合生成 6 段月报草稿（AI 辅助）。
   * 幂等：已有同 (customer, month) 草稿直接返回并 refresh sections。
   */
  async generate(
    tenantId: string,
    draftedBy: string,
    customerId: string,
    month: string,
  ): Promise<MonthlyReportEntity> {
    const customer = await this.customers.findByIdOrFail(tenantId, customerId);
    const agg = await this.metrics.monthlyAggregate(tenantId, customerId, month);

    // 6 段数据
    const sections: MonthlySections = {
      overview: {
        plays: agg.totalPlays,
        roi: Number(agg.avgRoi.toFixed(2)),
        adSpend: agg.totalAdSpend,
      },
      deliverables: {
        videoCount: agg.byVideo.length,
        topPlays: agg.byVideo[0]?.plays ?? 0,
      },
      trafficAnalysis: agg.totalPlays > 0
        ? `本月总播放 ${agg.totalPlays} · 点赞 ${agg.totalLikes} · 评论 ${agg.totalComments} · 分享 ${agg.totalShares}。`
        : '本月无发布数据。',
      topVideos: agg.byVideo.slice(0, 3),
      missed: '（待 PM 修订）',
      nextMonthFocus: ['保持发布节奏', '强化老板人设', '复盘本月 Top 3 爆点'],
    };

    // 调 LLM 生成总览文案
    const llm = await this.llm.invoke(
      'monthly-report.draft',
      {
        companyName: customer.companyName,
        month,
        sections,
      },
      { tenantId, staffId: draftedBy, temperature: 0.3 },
    );

    let row = await this.findByCustomerMonth(tenantId, customerId, month);
    if (!row) {
      row = this.repo.create({
        tenantId,
        customerId,
        projectId: null,
        month,
        status: 'drafting',
        draftedBy,
        aiDraft: llm.content,
        finalContent: llm.content,
        sections: JSON.stringify(sections),
      });
    } else {
      if (row.status !== 'drafting') {
        throw new ConflictException({
          code: 'REPORT_NOT_EDITABLE',
          message: `月报 ${row.status} 状态下不可再生成`,
        });
      }
      row.aiDraft = llm.content;
      row.sections = JSON.stringify(sections);
      if (!row.finalContent) row.finalContent = llm.content;
    }
    return this.repo.save(row);
  }

  async update(
    tenantId: string,
    id: string,
    patch: { finalContent?: string; sections?: MonthlySections },
  ): Promise<MonthlyReportEntity> {
    const row = await this.findById(tenantId, id);
    if (row.status !== 'drafting' && row.status !== 'pending_review') {
      throw new ConflictException({
        code: 'REPORT_NOT_EDITABLE',
        message: `月报 ${row.status} 状态下不可编辑`,
      });
    }
    if (patch.finalContent !== undefined) row.finalContent = patch.finalContent;
    if (patch.sections !== undefined) row.sections = JSON.stringify(patch.sections);
    return this.repo.save(row);
  }

  async publish(tenantId: string, id: string): Promise<MonthlyReportEntity> {
    const row = await this.findById(tenantId, id);
    if (row.status === 'sent' || row.status === 'read') return row;
    row.status = 'sent';
    row.pushedAt = new Date();
    row.h5Url = `/uploads/reports/${row.id}.html`; // phase 8 生成真实静态文件
    return this.repo.save(row);
  }

  /** 客户端读完回调（phase 7）。幂等：已读则直接返回。 */
  async markRead(tenantId: string, id: string): Promise<MonthlyReportEntity> {
    const row = await this.findById(tenantId, id);
    if (row.status === 'read') return row;
    row.status = 'read';
    row.readAt = new Date();
    return this.repo.save(row);
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { IsNull, Repository, In } from 'typeorm';
import { CustomerUserEntity } from '@/modules/client-users/entities/customer-user.entity';
import { CustomerEntity } from '@/modules/customers/entities/customer.entity';
import { VideoEntity, VideoStatus, VIDEO_STATUS_TRANSITIONS } from '@/modules/videos/entities/video.entity';
import { VideoCommentEntity } from '@/modules/videos/entities/video-comment.entity';
import { MonthlyReportEntity } from '@/modules/reports/entities/monthly-report.entity';
import { ContractEntity } from '@/modules/contracts/entities/contract.entity';
import { PaymentEntity } from '@/modules/contracts/entities/payment.entity';
import { RenewalRecordEntity } from '@/modules/renewals/entities/renewal-record.entity';
import { InvoiceRequestEntity } from '@/modules/client-users/entities/invoice-request.entity';
import { NpsService } from '@/modules/nps/nps.service';
import { ComplaintsService } from '@/modules/complaints/complaints.service';
import { WechatService } from '@/modules/wechat/wechat.service';
import { MetricsService } from '@/modules/metrics/metrics.service';
import { VideosService } from '@/modules/videos/videos.service';

export interface ClientSession {
  accessToken: string;
  expiresIn: number;
  customer: { id: string; name: string; phone: string };
}

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(CustomerUserEntity)
    private readonly users: Repository<CustomerUserEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customers: Repository<CustomerEntity>,
    @InjectRepository(VideoEntity)
    private readonly videos: Repository<VideoEntity>,
    @InjectRepository(VideoCommentEntity)
    private readonly comments: Repository<VideoCommentEntity>,
    @InjectRepository(MonthlyReportEntity)
    private readonly reports: Repository<MonthlyReportEntity>,
    @InjectRepository(ContractEntity)
    private readonly contracts: Repository<ContractEntity>,
    @InjectRepository(PaymentEntity)
    private readonly payments: Repository<PaymentEntity>,
    @InjectRepository(RenewalRecordEntity)
    private readonly renewals: Repository<RenewalRecordEntity>,
    @InjectRepository(InvoiceRequestEntity)
    private readonly invoices: Repository<InvoiceRequestEntity>,
    private readonly nps: NpsService,
    private readonly complaints: ComplaintsService,
    private readonly wechat: WechatService,
    private readonly metrics: MetricsService,
    private readonly videosSvc: VideosService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ============ AUTH ============

  /**
   * 微信登录。code → openid。
   *  - 未绑定 → 返回 { needBind: true, tempToken }
   *  - 已绑定 → 签发 customer JWT
   */
  async wechatLogin(code: string): Promise<
    | { needBind: true; tempToken: string }
    | { needBind: false; session: ClientSession }
  > {
    const { openid } = await this.wechat.code2Session(code);
    const existing = await this.users.findOne({ where: { openid } });
    if (existing) {
      existing.lastLoginAt = new Date();
      existing.loginCount = (existing.loginCount ?? 0) + 1;
      await this.users.save(existing);
      const customer = await this.customers.findOne({ where: { id: existing.customerId } });
      if (!customer) throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: '客户档案不存在' });
      return { needBind: false, session: await this.signSession(existing, customer) };
    }
    // 签临时 token，用于绑定阶段
    const tempToken = await this.jwt.signAsync(
      { openid, purpose: 'bind' },
      { secret: this.config.get<string>('jwt.secret'), expiresIn: '15m' as unknown as number },
    );
    return { needBind: true, tempToken };
  }

  /**
   * 绑定手机号。MVP：手机号匹配 customer.bossPhone 即绑定；phase 8 加短信验证码。
   */
  async bindPhone(tempToken: string, phone: string, _verifyCode?: string): Promise<ClientSession> {
    let payload: { openid: string; purpose: string };
    try {
      payload = await this.jwt.verifyAsync(tempToken, {
        secret: this.config.get<string>('jwt.secret'),
      });
    } catch {
      throw new BadRequestException({ code: 'TEMP_TOKEN_INVALID', message: '临时 token 无效或已过期' });
    }
    if (payload.purpose !== 'bind') {
      throw new BadRequestException({ code: 'TEMP_TOKEN_INVALID', message: 'token 用途不符' });
    }
    const customer = await this.customers.findOne({ where: { bossPhone: phone } });
    if (!customer) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: '未找到与该手机号匹配的客户档案',
      });
    }
    // 检查是否已被其他 openid 占用
    const existing = await this.users.findOne({
      where: { tenantId: customer.tenantId, customerId: customer.id },
    });
    if (existing && existing.openid && existing.openid !== payload.openid) {
      throw new ConflictException({
        code: 'CUSTOMER_ALREADY_BOUND',
        message: '该客户档案已被其他微信账号绑定',
      });
    }
    const row =
      existing ??
      this.users.create({
        tenantId: customer.tenantId,
        customerId: customer.id,
        phone,
        loginCount: 0,
      });
    row.openid = payload.openid;
    row.phone = phone;
    row.lastLoginAt = new Date();
    row.loginCount = (row.loginCount ?? 0) + 1;
    const saved = await this.users.save(row);
    return this.signSession(saved, customer);
  }

  /** 开发态：直接凭手机号登录，用于 phase 7 没有微信 AppId 时跑通流程。 */
  async devLogin(phone: string): Promise<ClientSession> {
    const customer = await this.customers.findOne({ where: { bossPhone: phone } });
    if (!customer) {
      throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: '未找到手机号匹配的客户' });
    }
    let row = await this.users.findOne({
      where: { tenantId: customer.tenantId, customerId: customer.id },
    });
    if (!row) {
      row = this.users.create({
        tenantId: customer.tenantId,
        customerId: customer.id,
        phone,
        openid: `dev:${phone}`,
        loginCount: 0,
      });
    }
    row.lastLoginAt = new Date();
    row.loginCount = (row.loginCount ?? 0) + 1;
    const saved = await this.users.save(row);
    return this.signSession(saved, customer);
  }

  async me(customerUserId: string) {
    const u = await this.users.findOne({ where: { id: customerUserId } });
    if (!u) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: '客户账号不存在' });
    const c = await this.customers.findOne({ where: { id: u.customerId } });
    return {
      customerUserId: u.id,
      customer: c && { id: c.id, name: c.companyName, phone: c.bossPhone, industry: c.industry },
      lastLoginAt: u.lastLoginAt,
      loginCount: u.loginCount,
    };
  }

  private async signSession(
    user: CustomerUserEntity,
    customer: CustomerEntity,
  ): Promise<ClientSession> {
    const secret = this.config.get<string>('jwt.secret') ?? 'dev';
    const expiresIn = this.config.get<string>('jwt.expiresIn') ?? '1h';
    const accessToken = await this.jwt.signAsync(
      {
        customerUserId: user.id,
        customerId: customer.id,
        tenantId: user.tenantId,
        role: 'customer',
      },
      { secret, expiresIn: expiresIn as unknown as number },
    );
    return {
      accessToken,
      expiresIn: this.ttlSeconds(expiresIn),
      customer: { id: customer.id, name: customer.companyName, phone: customer.bossPhone },
    };
  }

  private ttlSeconds(spec: string): number {
    const m = /^(\d+)(s|m|h|d)$/.exec(spec);
    if (!m) return 3600;
    const n = Number(m[1]);
    return m[2] === 's' ? n : m[2] === 'm' ? n * 60 : m[2] === 'h' ? n * 3600 : n * 86400;
  }

  // ============ DASHBOARD ============

  async dashboard(tenantId: string, customerId: string) {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [agg, pendingVideos, unreadReports, pendingPays, currentRenewal, latestReport] =
      await Promise.all([
        this.metrics.monthlyAggregate(tenantId, customerId, month),
        this.videos.find({
          where: { tenantId, customerId, status: 'pending_review' },
          take: 5,
          order: { reviewSubmittedAt: 'ASC' },
        }),
        this.reports.find({
          where: [
            { tenantId, customerId, status: 'sent' },
          ],
          take: 3,
          order: { pushedAt: 'DESC' },
        }),
        this.payments.find({
          where: [{ tenantId, customerId, status: 'pending' }, { tenantId, customerId, status: 'overdue' }],
          order: { dueAt: 'ASC' },
          take: 3,
        }),
        this.renewals.findOne({
          where: [
            { tenantId, customerId, stage: 'warning' },
            { tenantId, customerId, stage: 'negotiating' },
          ],
          order: { expiresAt: 'ASC' },
        }),
        this.reports.findOne({
          where: [
            { tenantId, customerId, status: 'read' },
            { tenantId, customerId, status: 'sent' },
          ],
          order: { pushedAt: 'DESC' },
        }),
      ]);

    const publishedVideos = await this.videos.find({
      where: { tenantId, customerId, status: 'published' },
      order: { updatedAt: 'DESC' },
      take: 5,
    });

    return {
      metrics: {
        plays: agg.totalPlays,
        revenueHint: '—', // MVP：客户业务流水由 PM 在月报里填，这里不直接显示金额
        roi: Number(agg.avgRoi.toFixed(2)),
      },
      todos: {
        pendingReviews: pendingVideos.map((v) => ({
          id: v.id, title: v.title, submittedAt: v.reviewSubmittedAt,
        })),
        unreadReports: unreadReports.filter((r) => r.status === 'sent').map((r) => ({
          id: r.id, month: r.month,
        })),
        pendingPayments: pendingPays.map((p) => ({
          id: p.id, stage: p.stage, amount: p.amount, dueAt: p.dueAt,
        })),
      },
      recentVideos: publishedVideos.map((v) => ({
        id: v.id, title: v.title, coverUrl: v.coverUrl, publishedAt: v.updatedAt,
      })),
      latestReport: latestReport && {
        id: latestReport.id, month: latestReport.month, status: latestReport.status,
      },
      renewal: currentRenewal && {
        id: currentRenewal.id, stage: currentRenewal.stage,
        expiresAt: currentRenewal.expiresAt,
      },
    };
  }

  // ============ VIDEOS (CLIENT) ============

  async pendingReviews(tenantId: string, customerId: string) {
    return this.videos.find({
      where: { tenantId, customerId, status: 'pending_review' },
      order: { reviewSubmittedAt: 'ASC' },
    });
  }

  async videoDetail(tenantId: string, customerId: string, videoId: string) {
    const v = await this.videos.findOne({ where: { tenantId, customerId, id: videoId } });
    if (!v) throw new NotFoundException({ code: 'VIDEO_NOT_FOUND', message: '视频不存在' });
    const comments = await this.comments.find({
      where: { tenantId, videoId },
      order: { timestamp: 'ASC' },
    });
    return { video: v, comments };
  }

  async addVideoComment(
    tenantId: string,
    customerId: string,
    customerUserId: string,
    videoId: string,
    body: { timestamp: number; text: string; author?: string },
  ) {
    const v = await this.videos.findOne({ where: { tenantId, customerId, id: videoId } });
    if (!v) throw new NotFoundException({ code: 'VIDEO_NOT_FOUND', message: '视频不存在' });
    const row = this.comments.create({
      tenantId, videoId,
      customerUserId,
      author: body.author ?? '客户',
      timestamp: Math.max(0, Number(body.timestamp) || 0),
      text: body.text,
    });
    return this.comments.save(row);
  }

  async reviewVideo(
    tenantId: string,
    customerId: string,
    videoId: string,
    action: 'approve' | 'minor_change' | 'reshoot',
  ) {
    const v = await this.videos.findOne({ where: { tenantId, customerId, id: videoId } });
    if (!v) throw new NotFoundException({ code: 'VIDEO_NOT_FOUND', message: '视频不存在' });
    if (v.status !== 'pending_review') {
      throw new ConflictException({
        code: 'VIDEO_NOT_PENDING_REVIEW',
        message: `视频当前 ${v.status}，不是待审`,
      });
    }
    const target: VideoStatus =
      action === 'approve' ? 'approved' : action === 'minor_change' ? 'minor_change' : 'reshoot';
    const allowed = VIDEO_STATUS_TRANSITIONS.pending_review;
    if (!allowed.includes(target)) {
      throw new ConflictException({
        code: 'VIDEO_INVALID_STATUS_TRANSITION',
        message: `不允许的审核动作 ${action}`,
      });
    }
    v.status = target;
    v.reviewedAt = new Date();
    return this.videos.save(v);
  }

  // ============ REPORTS (CLIENT) ============

  async listReports(tenantId: string, customerId: string) {
    return this.reports.find({
      where: [
        { tenantId, customerId, status: 'sent' },
        { tenantId, customerId, status: 'read' },
      ],
      order: { month: 'DESC' },
    });
  }

  async reportDetail(tenantId: string, customerId: string, id: string) {
    const r = await this.reports.findOne({ where: { tenantId, customerId, id } });
    if (!r) throw new NotFoundException({ code: 'REPORT_NOT_FOUND', message: '月报不存在' });
    if (!['sent', 'read'].includes(r.status)) {
      throw new NotFoundException({ code: 'REPORT_NOT_PUBLISHED', message: '月报尚未推送' });
    }
    return r;
  }

  async markReportRead(tenantId: string, customerId: string, id: string) {
    const r = await this.reports.findOne({ where: { tenantId, customerId, id } });
    if (!r) throw new NotFoundException({ code: 'REPORT_NOT_FOUND', message: '月报不存在' });
    if (r.status === 'read') return r;
    if (r.status !== 'sent') {
      throw new ConflictException({
        code: 'REPORT_NOT_PUBLISHED', message: '月报尚未推送，不能标已读',
      });
    }
    r.status = 'read';
    r.readAt = new Date();
    return this.reports.save(r);
  }

  // ============ NPS / COMPLAINTS ============

  async submitNps(
    tenantId: string,
    customerId: string,
    customerUserId: string,
    body: { reportId?: string; score: number; comment?: string },
  ) {
    return this.nps.submit(tenantId, {
      customerId, reportId: body.reportId, score: body.score, comment: body.comment,
      submittedBy: customerUserId,
    });
  }

  async fileComplaint(
    tenantId: string,
    customerId: string,
    body: { severity?: 'low' | 'mid' | 'high'; content: string },
  ) {
    return this.complaints.create(tenantId, {
      customerId, severity: body.severity ?? 'mid', content: body.content, source: 'customer',
    });
  }

  // ============ CONTRACTS / RENEWALS ============

  async listContracts(tenantId: string, customerId: string) {
    const contracts = await this.contracts.find({
      where: { tenantId, customerId },
      order: { createdAt: 'DESC' },
    });
    const ids = contracts.map((c) => c.id);
    const payments = ids.length
      ? await this.payments.find({ where: { tenantId, contractId: In(ids) } })
      : [];
    const byContract = new Map<string, PaymentEntity[]>();
    for (const p of payments) {
      const arr = byContract.get(p.contractId) ?? [];
      arr.push(p);
      byContract.set(p.contractId, arr);
    }
    return contracts.map((c) => ({
      contract: c,
      payments: byContract.get(c.id) ?? [],
    }));
  }

  async uploadVoucher(
    tenantId: string,
    customerId: string,
    contractId: string,
    paymentId: string,
    voucherUrl: string,
  ) {
    const p = await this.payments.findOne({ where: { tenantId, contractId, customerId, id: paymentId } });
    if (!p) throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: '付款不存在' });
    p.voucherUrl = voucherUrl;
    return this.payments.save(p);
  }

  async requestInvoice(
    tenantId: string,
    customerId: string,
    body: {
      contractId?: string;
      paymentIds?: string[];
      invoiceTitle: string;
      taxId?: string;
      invoiceType?: 'general' | 'special';
      mailAddress?: string;
    },
  ) {
    const row = this.invoices.create({
      tenantId, customerId,
      contractId: body.contractId ?? null,
      paymentIds: body.paymentIds ? JSON.stringify(body.paymentIds) : null,
      invoiceTitle: body.invoiceTitle,
      taxId: body.taxId ?? null,
      invoiceType: body.invoiceType ?? 'general',
      mailAddress: body.mailAddress ?? null,
      status: 'pending',
    });
    return this.invoices.save(row);
  }

  async currentRenewal(tenantId: string, customerId: string) {
    return this.renewals.findOne({
      where: [
        { tenantId, customerId, stage: 'warning' },
        { tenantId, customerId, stage: 'negotiating' },
      ],
      order: { expiresAt: 'ASC' },
    });
  }

  async bookRenewalConsult(tenantId: string, customerId: string, _renewalId: string) {
    // MVP：只打 log 通知 PM。phase 8 创建 Task 给 PM。
    console.info(
      `[client] 客户预约续约沟通 · tenant=${tenantId.slice(0, 8)}… customer=${customerId.slice(0, 8)}…`,
    );
    return { booked: true };
  }
}

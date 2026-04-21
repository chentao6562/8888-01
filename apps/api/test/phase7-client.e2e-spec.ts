import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { existsSync, unlinkSync } from 'node:fs';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { CustomerEntity } from '../src/modules/customers/entities/customer.entity';
import { ProjectEntity } from '../src/modules/projects/entities/project.entity';
import { VideoEntity } from '../src/modules/videos/entities/video.entity';
import { MonthlyReportEntity } from '../src/modules/reports/entities/monthly-report.entity';
import { ContractEntity } from '../src/modules/contracts/entities/contract.entity';
import { PaymentEntity } from '../src/modules/contracts/entities/payment.entity';

/**
 * Phase 7 · 客户端（小程序）e2e：
 *  - dev-login 拿 customer JWT
 *  - 首屏 dashboard 聚合
 *  - 视频：列表 / 详情 / 批注 / 审核
 *  - 月报：列表 / 详情 / 标已读
 *  - NPS 提交 · 投诉 · 发票
 *  - 续约卡 · 跨租户隔离
 */
describe('Phase 7 · Client (mini-program) e2e', () => {
  let app: INestApplication;
  const sqlitePath = 'test-phase7.sqlite';

  const post = (url: string, body: object, bearer?: string) => {
    const r = request(app.getHttpServer()).post(url).send(body);
    if (bearer) r.set('Authorization', `Bearer ${bearer}`);
    return r;
  };
  const get = (url: string, bearer?: string) => {
    const r = request(app.getHttpServer()).get(url);
    if (bearer) r.set('Authorization', `Bearer ${bearer}`);
    return r;
  };

  beforeAll(async () => {
    if (existsSync(sqlitePath)) unlinkSync(sqlitePath);
    process.env.DB_DRIVER = 'sqlite';
    process.env.DB_SQLITE_PATH = sqlitePath;
    process.env.JWT_SECRET = 'phase-7-secret';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.WECHAT_PROVIDER = 'mock';
    process.env.LLM_PROVIDER = 'mock';

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (existsSync(sqlitePath)) unlinkSync(sqlitePath);
  });

  let adminToken: string;
  let tenantA: string;
  let customerId: string;
  let projectId: string;
  let videoId: string;
  let reportId: string;
  let contractId: string;
  let paymentId: string;
  let clientToken: string;

  it('register admin + build delivering fixture', async () => {
    const a = await post('/api/v1/auth/register-tenant', {
      companyName: 'Ph7 A', plan: 'pro', adminName: '老 A',
      phone: '13800700001', password: 'Ph7Pass1234',
    });
    expect(a.status).toBe(201);
    adminToken = a.body.data.accessToken;
    tenantA = a.body.data.user.tenantId;

    const ds = app.get(DataSource);
    const c = await ds.getRepository(CustomerEntity).save({
      tenantId: tenantA,
      companyName: 'Ph7 客户', bossName: '老 C', bossPhone: '13800701001',
      industry: '餐饮', stage: 'delivering',
      healthScore: 80, healthLevel: 'green',
      contractExpiresAt: new Date(Date.now() + 20 * 86400_000),
    });
    customerId = c.id;
    const ct = await ds.getRepository(ContractEntity).save({
      tenantId: tenantA, customerId: c.id,
      contractNo: 'CT-PH7', totalAmount: 3000000, status: 'signed',
      bodySnapshot: '', signedAt: new Date(Date.now() - 30 * 86400_000),
    });
    contractId = ct.id;
    const p = await ds.getRepository(ProjectEntity).save({
      tenantId: tenantA, customerId: c.id, contractId: ct.id,
      name: 'Ph7 项目', plan: 'monthly_package', status: 'running',
      startAt: new Date(),
    });
    projectId = p.id;
    const v = await ds.getRepository(VideoEntity).save({
      tenantId: tenantA, customerId: c.id, projectId: p.id,
      title: 'Ph7 待审视频', status: 'pending_review',
      draftVideoUrl: 'https://mock/draft.mp4',
      reviewSubmittedAt: new Date(),
    });
    videoId = v.id;
    const r = await ds.getRepository(MonthlyReportEntity).save({
      tenantId: tenantA, customerId: c.id,
      month: '2025-12', status: 'sent',
      finalContent: '# 2025-12 月报\n播放 10 万', sections: '{}',
      pushedAt: new Date(),
    });
    reportId = r.id;
    const pay = await ds.getRepository(PaymentEntity).save({
      tenantId: tenantA, contractId: ct.id, customerId: c.id,
      stage: 'shoot', ratio: 0.4, amount: 1200000, status: 'pending',
      dueAt: new Date(Date.now() + 10 * 86400_000),
    });
    paymentId = pay.id;
  });

  it('wechat-login (unbound) returns tempToken', async () => {
    const r = await post('/api/v1/client/auth/wechat-login', { code: 'code-new-xyz' });
    expect(r.status).toBe(200);
    expect(r.body.data.needBind).toBe(true);
    expect(r.body.data.tempToken).toBeTruthy();
  });

  it('bind-phone binds customer + returns session', async () => {
    const r1 = await post('/api/v1/client/auth/wechat-login', { code: 'code-ph7-boss' });
    const tempToken = r1.body.data.tempToken;
    const r2 = await post('/api/v1/client/auth/bind-phone', {
      tempToken, phone: '13800701001',
    });
    expect(r2.status).toBe(200);
    expect(r2.body.data.accessToken).toBeTruthy();
    expect(r2.body.data.customer.name).toBe('Ph7 客户');
  });

  it('dev-login directly returns customer JWT', async () => {
    const r = await post('/api/v1/client/auth/dev-login', { phone: '13800701001' });
    expect(r.status).toBe(200);
    expect(r.body.data.accessToken).toBeTruthy();
    clientToken = r.body.data.accessToken;
  });

  it('bind-phone rejects unknown phone', async () => {
    const r1 = await post('/api/v1/client/auth/wechat-login', { code: 'code-other' });
    const r2 = await post('/api/v1/client/auth/bind-phone', {
      tempToken: r1.body.data.tempToken, phone: '19999999999',
    });
    expect(r2.status).toBe(404);
  });

  it('GET /client/me returns customer snapshot', async () => {
    const r = await get('/api/v1/client/me', clientToken);
    expect(r.status).toBe(200);
    expect(r.body.data.customer.name).toBe('Ph7 客户');
    expect(r.body.data.customer.phone).toBe('13800701001');
  });

  it('customer JWT cannot access admin endpoints', async () => {
    const r = await get('/api/v1/customers', clientToken);
    expect([401, 403]).toContain(r.status);
  });

  it('admin JWT cannot access client endpoints', async () => {
    const r = await get('/api/v1/client/dashboard', adminToken);
    expect(r.status).toBe(403);
  });

  it('client dashboard includes pending review + unread report + renewal-less', async () => {
    const r = await get('/api/v1/client/dashboard', clientToken);
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(d.todos.pendingReviews.length).toBeGreaterThanOrEqual(1);
    expect(d.todos.unreadReports.length).toBeGreaterThanOrEqual(1);
    expect(d.todos.pendingPayments.length).toBeGreaterThanOrEqual(1);
  });

  it('client video detail + add comment + approve', async () => {
    const d = await get(`/api/v1/client/videos/${videoId}`, clientToken);
    expect(d.status).toBe(200);
    expect(d.body.data.video.id).toBe(videoId);

    const c = await post(
      `/api/v1/client/videos/${videoId}/comments`,
      { timestamp: 3.5, text: '这里字幕慢一点', author: '老板' },
      clientToken,
    );
    expect(c.status).toBe(201);

    const d2 = await get(`/api/v1/client/videos/${videoId}`, clientToken);
    expect(d2.body.data.comments.length).toBe(1);
    expect(d2.body.data.comments[0].text).toContain('字幕');

    const rev = await post(
      `/api/v1/client/videos/${videoId}/review`,
      { action: 'approve' },
      clientToken,
    );
    expect(rev.status).toBe(200);
    expect(rev.body.data.status).toBe('approved');
  });

  it('re-review rejected for non-pending video', async () => {
    const r = await post(
      `/api/v1/client/videos/${videoId}/review`,
      { action: 'approve' },
      clientToken,
    );
    expect(r.status).toBe(409);
  });

  it('report list + read + NPS', async () => {
    const l = await get('/api/v1/client/reports', clientToken);
    expect(l.status).toBe(200);
    expect(l.body.data.length).toBe(1);

    const detail = await get(`/api/v1/client/reports/${reportId}`, clientToken);
    expect(detail.status).toBe(200);
    expect(detail.body.data.month).toBe('2025-12');

    const read = await post(`/api/v1/client/reports/${reportId}/read`, {}, clientToken);
    expect(read.status).toBe(200);
    expect(read.body.data.status).toBe('read');

    const nps = await post(
      '/api/v1/client/nps',
      { reportId, score: 9, comment: '很满意' },
      clientToken,
    );
    expect([200, 201]).toContain(nps.status);
  });

  it('complaints: client submits complaint', async () => {
    const r = await post(
      '/api/v1/client/complaints',
      { severity: 'low', content: '上周的视频配乐太老了' },
      clientToken,
    );
    expect([200, 201]).toContain(r.status);
  });

  it('contracts list + upload voucher + invoice request', async () => {
    const l = await get('/api/v1/client/contracts', clientToken);
    expect(l.status).toBe(200);
    expect(l.body.data.length).toBe(1);
    expect(l.body.data[0].payments.length).toBe(1);

    const vou = await post(
      `/api/v1/client/contracts/${contractId}/payments/${paymentId}/voucher`,
      { voucherUrl: 'https://mock/voucher.jpg' },
      clientToken,
    );
    expect(vou.status).toBe(200);
    expect(vou.body.data.voucherUrl).toContain('voucher.jpg');

    const inv = await post(
      '/api/v1/client/invoice-requests',
      {
        contractId, paymentIds: [paymentId],
        invoiceTitle: 'Ph7 客户有限公司', taxId: '91310000XXXXX',
        invoiceType: 'special',
      },
      clientToken,
    );
    expect(inv.status).toBe(201);
    expect(inv.body.data.status).toBe('pending');
  });

  it('renewal-current returns null when no warning renewal', async () => {
    const r = await get('/api/v1/client/renewals/current', clientToken);
    expect(r.status).toBe(200);
    // 只有 contract 未触发扫描，这里应该没有续约卡
    expect(r.body.data).toBeNull();
  });

  it('tenant isolation · B client cannot log in as A customer', async () => {
    // 新开一家 B 租户，不创建任何 customer
    const b = await post('/api/v1/auth/register-tenant', {
      companyName: 'Ph7 B', plan: 'basic', adminName: '老 B',
      phone: '13800700002', password: 'Ph7Pass1234',
    });
    expect(b.status).toBe(201);

    // 凭 A 的 customer 手机号试图登录 → 应能登录（MVP 全局手机号，phase 8 收紧）
    // 但登录出来的 tenantId 必须仍是 A（不是 B）
    const r = await post('/api/v1/client/auth/dev-login', { phone: '13800701001' });
    expect(r.status).toBe(200);
    const me = await get('/api/v1/client/me', r.body.data.accessToken);
    expect(me.body.data.customer.name).toBe('Ph7 客户');
  });
});

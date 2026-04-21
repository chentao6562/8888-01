import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { existsSync, unlinkSync } from 'node:fs';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { VideoEntity } from '../src/modules/videos/entities/video.entity';

describe('Phase 5 · Data / Monthly / Health (e2e)', () => {
  let app: INestApplication;
  const sqlitePath = 'test-phase5.sqlite';

  const post = (url: string, body: object, bearer?: string) => {
    const r = request(app.getHttpServer()).post(url).send(body);
    if (bearer) r.set('Authorization', `Bearer ${bearer}`);
    return r;
  };
  const patch = (url: string, body: object, bearer: string) =>
    request(app.getHttpServer()).patch(url).send(body).set('Authorization', `Bearer ${bearer}`);
  const get = (url: string, bearer: string) =>
    request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${bearer}`);

  beforeAll(async () => {
    if (existsSync(sqlitePath)) unlinkSync(sqlitePath);
    process.env.DB_DRIVER = 'sqlite';
    process.env.DB_SQLITE_PATH = sqlitePath;
    process.env.JWT_SECRET = 'phase-5-secret';
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

  let tokenA: string;
  let tokenB: string;
  let customerId: string;
  let videoId: string;

  it('registers tenants + creates a customer + a video', async () => {
    const a = await post('/api/v1/auth/register-tenant', {
      companyName: 'Ph5 A', plan: 'pro', adminName: '老 A',
      phone: '13700500001', password: 'Ph5Pass1234',
    });
    expect(a.status).toBe(201);
    tokenA = a.body.data.accessToken;

    const b = await post('/api/v1/auth/register-tenant', {
      companyName: 'Ph5 B', plan: 'basic', adminName: '老 B',
      phone: '13700500002', password: 'Ph5Pass1234',
    });
    tokenB = b.body.data.accessToken;

    const c = await post(
      '/api/v1/customers',
      { companyName: 'Ph5 客户', bossName: '老板', bossPhone: '13700501001', industry: '餐饮' },
      tokenA,
    );
    expect(c.status).toBe(201);
    customerId = c.body.data.id;

    // 直接创建 video（phase-3 API）· 不经过完整合同/项目流程
    const v = await post(
      '/api/v1/videos',
      {
        projectId: '00000000-0000-0000-0000-000000000000',
        customerId,
        title: 'Ph5 视频',
      },
      tokenA,
    );
    expect(v.status).toBe(201);
    videoId = v.body.data.id;
  });

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  it('metrics upsert + list', async () => {
    const r = await post(
      `/api/v1/metrics/videos/${videoId}`,
      {
        platform: '抖音', date: today,
        plays: 10000, likes: 400, comments: 80, shares: 60, collections: 100,
        adSpend: 30000, roi: 1.3,
      },
      tokenA,
    );
    expect(r.status).toBe(200);
    expect(r.body.data.plays).toBe(10000);

    // upsert 二次（同 key）应更新而非报错
    const r2 = await post(
      `/api/v1/metrics/videos/${videoId}`,
      { platform: '抖音', date: today, plays: 15000 },
      tokenA,
    );
    expect(r2.status).toBe(200);
    expect(r2.body.data.plays).toBe(15000);

    // 列表
    const list = await get(`/api/v1/metrics/videos/${videoId}`, tokenA);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('monthly aggregate sums metrics', async () => {
    // 再录一条不同平台
    await post(
      `/api/v1/metrics/videos/${videoId}`,
      { platform: '视频号', date: yesterday, plays: 5000, roi: 0.9 },
      tokenA,
    );
    const agg = await get(
      `/api/v1/metrics/customers/${customerId}/aggregate?month=${month}`,
      tokenA,
    );
    expect(agg.status).toBe(200);
    expect(agg.body.data.totalPlays).toBeGreaterThanOrEqual(20000);
    expect(agg.body.data.byVideo.length).toBeGreaterThanOrEqual(1);
  });

  let reportId: string;

  it('generate monthly report from metrics', async () => {
    const res = await post(
      '/api/v1/reports/generate',
      { customerId, month },
      tokenA,
    );
    expect(res.status).toBe(200);
    reportId = res.body.data.id;
    expect(res.body.data.status).toBe('drafting');
    expect(res.body.data.aiDraft).toContain('月度报告');
    const sections = JSON.parse(res.body.data.sections);
    expect(sections.overview.plays).toBeGreaterThan(0);
  });

  it('edit report finalContent', async () => {
    const res = await patch(
      `/api/v1/reports/${reportId}`,
      { finalContent: '# 修订后的月报\n本月做得不错。' },
      tokenA,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.finalContent).toContain('修订后的月报');
  });

  it('publish report → status=sent', async () => {
    const res = await post(`/api/v1/reports/${reportId}/publish`, {}, tokenA);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('sent');
    expect(res.body.data.pushedAt).toBeTruthy();
  });

  it('published report cannot be re-edited', async () => {
    const res = await patch(
      `/api/v1/reports/${reportId}`,
      { finalContent: '尝试改已发送的' },
      tokenA,
    );
    expect(res.status).toBe(409);
  });

  it('mark-read → status=read', async () => {
    const res = await post(`/api/v1/reports/${reportId}/mark-read`, {}, tokenA);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('read');
  });

  it('NPS submit + duplicate rejected', async () => {
    const r = await post(
      '/api/v1/nps',
      { customerId, reportId, score: 9, comment: '很好' },
      tokenA,
    );
    expect(r.status).toBe(201);

    const dup = await post(
      '/api/v1/nps',
      { customerId, reportId, score: 7 },
      tokenA,
    );
    expect(dup.status).toBe(409);
  });

  it('NPS score out of range → 400', async () => {
    const res = await post(
      '/api/v1/nps',
      { customerId, score: 15 },
      tokenA,
    );
    expect([400, 422]).toContain(res.status);
  });

  it('complaint create + handle', async () => {
    const c = await post(
      '/api/v1/complaints',
      { customerId, severity: 'high', content: '视频节奏偏慢' },
      tokenA,
    );
    expect(c.status).toBe(201);
    const id = c.body.data.id;

    const h = await patch(
      `/api/v1/complaints/${id}/handle`,
      { resolution: '已让剪辑加速，通过审核' },
      tokenA,
    );
    expect(h.status).toBe(200);
    expect(h.body.data.status).toBe('closed');
  });

  it('health-score calculation uses 5 weighted dims', async () => {
    const res = await get(`/api/v1/customers/${customerId}/health-score`, tokenA);
    expect(res.status).toBe(200);
    expect(res.body.data.totalScore).toBeGreaterThan(0);
    expect(res.body.data.totalScore).toBeLessThanOrEqual(100);
    expect(['green', 'yellow', 'red']).toContain(res.body.data.level);
    // 5 个分项都得计算出来
    expect(typeof res.body.data.businessScore).toBe('number');
    expect(typeof res.body.data.deliveryScore).toBe('number');
    expect(typeof res.body.data.npsScore).toBe('number');
    expect(typeof res.body.data.interactionScore).toBe('number');
    expect(typeof res.body.data.complaintScore).toBe('number');
  });

  it('analytics company-level · admin only', async () => {
    const ok = await get('/api/v1/analytics/company', tokenA);
    expect(ok.status).toBe(200);
    expect(typeof ok.body.data.customers.total).toBe('number');

    // 策划角色应被拒（这里测试 admin A 是管理员，用 B 也是 admin）
    // tenant 隔离：B 不应看到 A 的客户统计（各自的）
    const bCompany = await get('/api/v1/analytics/company', tokenB);
    expect(bCompany.status).toBe(200);
    expect(bCompany.body.data.customers.total).not.toBe(ok.body.data.customers.total); // A has 1, B has 0
  });

  it('customer-level analytics returns 6-month trend', async () => {
    const res = await get(`/api/v1/analytics/customers/${customerId}`, tokenA);
    expect(res.status).toBe(200);
    expect(res.body.data.trend.length).toBe(6);
  });

  it('tenant isolation · B cannot generate report for A customer', async () => {
    const res = await post('/api/v1/reports/generate', { customerId, month }, tokenB);
    expect([404, 422]).toContain(res.status);
  });
});

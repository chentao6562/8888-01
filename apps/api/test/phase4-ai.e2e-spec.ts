import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { existsSync, unlinkSync } from 'node:fs';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { CaseEntity } from '../src/modules/cases/entities/case.entity';

describe('Phase 4 · AI Content (e2e)', () => {
  let app: INestApplication;
  const sqlitePath = 'test-phase4.sqlite';

  const post = (url: string, body: object, bearer?: string) => {
    const r = request(app.getHttpServer()).post(url).send(body);
    if (bearer) r.set('Authorization', `Bearer ${bearer}`);
    return r;
  };
  const get = (url: string, bearer: string) =>
    request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${bearer}`);

  beforeAll(async () => {
    if (existsSync(sqlitePath)) unlinkSync(sqlitePath);
    process.env.DB_DRIVER = 'sqlite';
    process.env.DB_SQLITE_PATH = sqlitePath;
    process.env.JWT_SECRET = 'phase-4-secret';
    process.env.LLM_PROVIDER = 'mock';

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    // 塞一条官方案例用于列表断言
    const ds = app.get(DataSource);
    await ds.getRepository(CaseEntity).save({
      tenantId: null,
      category: 'copy',
      title: '官方示例 · 文案',
      content: '【钩子】测试\n【主体】测试\n【CTA】测试',
      industry: '餐饮',
      tags: null,
      metrics: null,
      callCount: 10,
      freshness: 'fresh',
    });
  });

  afterAll(async () => {
    await app.close();
    if (existsSync(sqlitePath)) unlinkSync(sqlitePath);
  });

  let tokenA: string;
  let tokenB: string;

  it('registers tenants', async () => {
    const a = await post('/api/v1/auth/register-tenant', {
      companyName: 'Ph4 A', plan: 'pro', adminName: '老 A',
      phone: '13600400001', password: 'Ph4Pass1234',
    });
    expect(a.status).toBe(201);
    tokenA = a.body.data.accessToken;

    const b = await post('/api/v1/auth/register-tenant', {
      companyName: 'Ph4 B', plan: 'basic', adminName: '老 B',
      phone: '13600400002', password: 'Ph4Pass1234',
    });
    tokenB = b.body.data.accessToken;
  });

  it('copywriting returns three parts', async () => {
    const res = await post(
      '/api/v1/ai/copywriting',
      {
        sellingPoint: '本地 15 年老店，味道稳定',
        evidence: ['老客户每月回头 3 次', '食材可追溯'],
        framework: 'story',
        dialect: 'standard',
      },
      tokenA,
    );
    expect(res.status).toBe(200);
    expect(typeof res.body.data.hook).toBe('string');
    expect(typeof res.body.data.body).toBe('string');
    expect(typeof res.body.data.cta).toBe('string');
    expect(res.body.data.provider).toBe('mock');
  });

  it('titles returns 5 candidates sorted by ctrScore desc', async () => {
    const res = await post(
      '/api/v1/ai/titles',
      { summary: '驾校通过率 90% 的真实数据', dialect: 'standard' },
      tokenA,
    );
    expect(res.status).toBe(200);
    const candidates = res.body.data as Array<{ title: string; ctrScore: number }>;
    expect(candidates.length).toBeGreaterThanOrEqual(5);
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i - 1].ctrScore).toBeGreaterThanOrEqual(candidates[i].ctrScore);
    }
  });

  it('tags returns ≤ 15 items', async () => {
    const res = await post(
      '/api/v1/ai/tags',
      { platform: '抖音', content: '老彭驾校', industry: '教培' },
      tokenA,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(15);
  });

  it('dialect-adapt transforms text', async () => {
    const res = await post(
      '/api/v1/ai/dialect-adapt',
      { text: '这家店很好，非常棒的服务', dialect: 'dongbei' },
      tokenA,
    );
    expect(res.status).toBe(200);
    expect(typeof res.body.data.text).toBe('string');
  });

  it('sensitive pre-check blocks blacklisted input → 422', async () => {
    const res = await post(
      '/api/v1/ai/copywriting',
      { sellingPoint: '来玩博彩吧', evidence: [] },
      tokenA,
    );
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('SENSITIVE_WORD_DETECTED');
    expect(res.body.error.details.hits).toContain('博彩');
  });

  it('sensitive-check endpoint is independent and does not charge quota', async () => {
    const before = (await get('/api/v1/ai/usage', tokenA)).body.data.used;
    const res = await post(
      '/api/v1/ai/sensitive-check',
      { text: '这是一段包含赌博字样的测试' },
      tokenA,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.clean).toBe(false);
    expect(res.body.data.hits).toContain('赌博');
    const after = (await get('/api/v1/ai/usage', tokenA)).body.data.used;
    expect(after).toBe(before);
  });

  it('usage counter increments after copywriting call', async () => {
    const before = (await get('/api/v1/ai/usage', tokenA)).body.data.used;
    await post(
      '/api/v1/ai/copywriting',
      { sellingPoint: '测试一次调用' },
      tokenA,
    );
    const after = (await get('/api/v1/ai/usage', tokenA)).body.data.used;
    expect(after).toBeGreaterThan(before);
  });

  it('cases list merges official + tenant private; filter by category', async () => {
    const list = await get('/api/v1/cases?category=copy', tokenA);
    expect(list.status).toBe(200);
    const arr = list.body.data as Array<{ title: string; tenantId: string | null }>;
    expect(arr.length).toBeGreaterThanOrEqual(1);
    // 至少含一条官方（tenantId null）
    expect(arr.some((c) => c.tenantId === null)).toBe(true);
  });

  it('case detail increments callCount', async () => {
    const list = await get('/api/v1/cases', tokenA);
    const first = list.body.data[0];
    const before = first.callCount as number;
    const detail = await get(`/api/v1/cases/${first.id}`, tokenA);
    expect(detail.status).toBe(200);
    expect(detail.body.data.callCount).toBe(before + 1);
  });

  it('tenant B creates a private case, A cannot see it', async () => {
    const created = await post(
      '/api/v1/cases',
      { category: 'copy', title: 'B 私库', content: 'B 的内容' },
      tokenB,
    );
    expect(created.status).toBe(201);
    const aList = await get('/api/v1/cases?search=B%20%E7%A7%81%E5%BA%93', tokenA);
    expect(aList.status).toBe(200);
    expect(
      (aList.body.data as Array<{ title: string }>).some((c) => c.title === 'B 私库'),
    ).toBe(false);
  });

  it('teleprompter splits a video script into segments', async () => {
    // 建最小一条视频：需要 project + customer
    // 为避免重建复杂依赖，走 videos API 创建（customerId 随便给一个，项目也没做 FK 检查）
    const v = await post(
      '/api/v1/videos',
      {
        projectId: '00000000-0000-0000-0000-000000000000',
        customerId: '00000000-0000-0000-0000-000000000000',
        title: 'Ph4 提词视频',
        script: '大家好，我是老彭。欢迎来到我家小店。今天给你们聊聊做了 15 年的老店。',
      },
      tokenA,
    );
    expect(v.status).toBe(201);
    const videoId = v.body.data.id;

    const tp = await get(`/api/v1/teleprompter/videos/${videoId}`, tokenA);
    expect(tp.status).toBe(200);
    expect(tp.body.data.segments.length).toBeGreaterThanOrEqual(2);
    expect(tp.body.data.totalSeconds).toBeGreaterThan(0);
  });
});

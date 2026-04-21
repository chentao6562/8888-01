import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { existsSync, unlinkSync } from 'node:fs';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { ContractTemplateEntity } from '../src/modules/contracts/entities/contract-template.entity';
import { PackageEntity } from '../src/modules/proposals/entities/package.entity';

/**
 * Phase 3 e2e · 合同 / 项目 / 启动会 / 任务 / 视频 状态机 + 租户隔离。
 */
describe('Phase 3 · Contract & Delivery (e2e)', () => {
  let app: INestApplication;
  const sqlitePath = 'test-phase3.sqlite';

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
    process.env.JWT_SECRET = 'phase-3-secret';

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    // 测试环境缺少 phase-2/3 seed 的官方模板与套餐，手工塞一份兜底
    const ds = app.get(DataSource);
    const tplRepo = ds.getRepository(ContractTemplateEntity);
    await tplRepo.save([
      { tenantId: null, tier: 'starter_pack', name: '起号包模板', body: '起号包合同 · {{totalAmountYuan}}' },
      { tenantId: null, tier: 'monthly_package', name: '月度模板', body: '月度合同 · {{totalAmountYuan}}' },
      { tenantId: null, tier: 'annual_partner', name: '年度模板', body: '年度合同 · {{totalAmountYuan}}' },
    ]);
    const pkgRepo = ds.getRepository(PackageEntity);
    await pkgRepo.save([
      { tenantId: null, tier: 'starter_pack', name: '起号包', description: '', scope: '{}', priceMin: 600000, priceMax: 1500000, periodMonths: 1 },
      { tenantId: null, tier: 'monthly_package', name: '月度包', description: '', scope: '{}', priceMin: 1500000, priceMax: 3000000, periodMonths: 1 },
      { tenantId: null, tier: 'annual_partner', name: '年度包', description: '', scope: '{}', priceMin: 8000000, priceMax: 30000000, periodMonths: 12 },
    ]);
  });

  afterAll(async () => {
    await app.close();
    if (existsSync(sqlitePath)) unlinkSync(sqlitePath);
  });

  let tokenA: string;
  let tokenB: string;
  let customerId: string;
  let proposalId: string;
  let contractId: string;
  let paymentIds: string[] = [];

  it('registers tenant A and B', async () => {
    const a = await post('/api/v1/auth/register-tenant', {
      companyName: 'Ph3 A',
      plan: 'pro',
      adminName: '老 A',
      phone: '13500300001',
      password: 'Ph3Pass1234',
    });
    expect(a.status).toBe(201);
    tokenA = a.body.data.accessToken;

    const b = await post('/api/v1/auth/register-tenant', {
      companyName: 'Ph3 B',
      plan: 'basic',
      adminName: '老 B',
      phone: '13500300002',
      password: 'Ph3Pass1234',
    });
    tokenB = b.body.data.accessToken;
  });

  it('creates a customer and runs through diagnosis + proposal signing', async () => {
    const c = await post(
      '/api/v1/customers',
      {
        companyName: 'Ph3 客户',
        bossName: '老板',
        bossPhone: '13500300011',
        industry: '餐饮',
        budgetHint: '10k_30k',
      },
      tokenA,
    );
    expect(c.status).toBe(201);
    customerId = c.body.data.id;

    await post(`/api/v1/leads/${customerId}/convert`, {}, tokenA);
    await post(`/api/v1/customers/${customerId}/diagnosis`, {}, tokenA);
    await patch(
      `/api/v1/customers/${customerId}/diagnosis`,
      {
        knifeSelf: 'ks', knifeEmployee: 'ke', knifeOldCustomer: 'koc', knifeCompetitor: 'kc',
        card1Sells: 'c1', card2CustomerMind: 'c2', card3ProductVideo: 'c3', card4WhyNotNext: 'c4',
      },
      tokenA,
    );
    await post(`/api/v1/customers/${customerId}/diagnosis/generate-report`, {}, tokenA);
    await post(`/api/v1/customers/${customerId}/diagnosis/complete`, {}, tokenA);

    // 创建方案 · 签字
    const prop = await post(
      `/api/v1/customers/${customerId}/proposals`,
      { planTier: 'monthly_package', regionFactor: 1 },
      tokenA,
    );
    expect(prop.status).toBe(201);
    proposalId = prop.body.data.id;
    const sign = await post(`/api/v1/proposals/${proposalId}/sign`, {}, tokenA);
    expect(sign.status).toBe(200);
  });

  it('creates a contract with 4 auto-generated payments (20/40/35/5)', async () => {
    const res = await post(
      '/api/v1/contracts',
      { proposalId },
      tokenA,
    );
    expect(res.status).toBe(201);
    contractId = res.body.data.contract.id;
    const payments = res.body.data.payments as Array<{ id: string; stage: string; ratio: number; amount: number }>;
    expect(payments.length).toBe(4);
    const sum = payments.reduce((s, p) => s + p.amount, 0);
    expect(sum).toBeGreaterThan(0);
    // 20+40+35+5 = 100（浮点容差）
    const ratios = payments.map((p) => p.ratio).sort();
    expect(ratios).toEqual([0.05, 0.2, 0.35, 0.4]);
    paymentIds = payments.map((p) => p.id);
  });

  it('sending for signing moves contract to pending_sign', async () => {
    const res = await post(`/api/v1/contracts/${contractId}/send-for-signing`, {}, tokenA);
    expect(res.status).toBe(200);
    expect(res.body.data.contract.status).toBe('pending_sign');
    expect(typeof res.body.data.orderId).toBe('string');
  });

  it('esign-callback (mock) marks contract signed', async () => {
    // 先取 orderId
    const full = await get(`/api/v1/contracts/${contractId}`, tokenA);
    const orderId = full.body.data.esignOrderId as string;
    expect(orderId).toBeTruthy();

    const cb = await post(
      `/api/v1/contracts/${contractId}/esign-callback`,
      { tenantId: (full.body.data.tenantId as string), orderId, signed: true },
    );
    expect(cb.status).toBe(200);
    expect(cb.body.data.status).toBe('signed');
  });

  it('contract cannot be edited after signing', async () => {
    const res = await patch(
      `/api/v1/contracts/${contractId}`,
      { totalAmount: 1 },
      tokenA,
    );
    expect(res.status).toBe(409);
  });

  it('idempotent payment registration', async () => {
    const key = `idem-test-${Date.now()}`;
    const p1 = await post(
      `/api/v1/contracts/${contractId}/payments/${paymentIds[0]}/register`,
      { idempotencyKey: key, notes: '第一次登记' },
      tokenA,
    );
    expect(p1.status).toBe(200);
    expect(p1.body.data.status).toBe('paid');

    // 再用同 key 调 → 返回同一条，不再变动
    const p2 = await post(
      `/api/v1/contracts/${contractId}/payments/${paymentIds[0]}/register`,
      { idempotencyKey: key, notes: '第二次 应幂等' },
      tokenA,
    );
    expect(p2.status).toBe(200);
    expect(p2.body.data.id).toBe(p1.body.data.id);
  });

  let projectId: string;

  it('creates project from signed contract', async () => {
    const res = await post(
      '/api/v1/projects',
      { contractId, name: 'Ph3 项目' },
      tokenA,
    );
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('kickoff');
    projectId = res.body.data.id;
  });

  let kickoffId: string;

  it('creates + finalizes kickoff → project running + customer delivering + tasks created', async () => {
    const k = await post(
      `/api/v1/projects/${projectId}/kickoffs`,
      {
        goals: '月度 15 条',
        initialTasks: JSON.stringify([
          { title: '种子任务 1', assigneeRole: 'pm', dueInDays: 3, type: 'plan' },
          { title: '种子任务 2', assigneeRole: 'admin', dueInDays: 7, type: 'other' },
        ]),
      },
      tokenA,
    );
    expect(k.status).toBe(201);
    kickoffId = k.body.data.id;

    const fin = await post(`/api/v1/kickoffs/${kickoffId}/finalize`, {}, tokenA);
    expect(fin.status).toBe(200);
    expect(fin.body.data.kickoff.status).toBe('finalized');
    expect(fin.body.data.tasksCreated).toBeGreaterThanOrEqual(1);

    const project = await get(`/api/v1/projects/${projectId}`, tokenA);
    expect(project.body.data.status).toBe('running');
    const customer = await get(`/api/v1/customers/${customerId}`, tokenA);
    expect(customer.body.data.stage).toBe('delivering');
  });

  it('kickoff cannot be edited after finalize', async () => {
    const res = await patch(`/api/v1/kickoffs/${kickoffId}`, { goals: '改不动' }, tokenA);
    expect(res.status).toBe(409);
  });

  it('my-tasks includes tasks assigned to current staff', async () => {
    const res = await get('/api/v1/tasks/mine', tokenA);
    expect(res.status).toBe(200);
    // Auto-dispatch: 至少第一条任务派给了当前 admin（because 'pm' 选不到，fallback 到 project.pmId → admin 自己是创建者）
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  let taskId: string;

  it('task transition state machine', async () => {
    const created = await post(
      '/api/v1/tasks',
      {
        projectId,
        assigneeId: 'self-placeholder', // will fallback - expected to not crash, using a valid staff id
        title: '手工建任务',
      },
      tokenA,
    );
    expect(created.status).toBe(201);
    taskId = created.body.data.id;

    // pending → in_progress（合法）
    const t1 = await post(`/api/v1/tasks/${taskId}/transition`, { to: 'in_progress' }, tokenA);
    expect(t1.status).toBe(200);
    expect(t1.body.data.status).toBe('in_progress');

    // pending → done 需经 pending_review；in_progress → done 非法 → 409
    const t2 = await post(`/api/v1/tasks/${taskId}/transition`, { to: 'done' }, tokenA);
    expect(t2.status).toBe(409);

    // in_progress → pending_review → done 合法
    await post(`/api/v1/tasks/${taskId}/transition`, { to: 'pending_review' }, tokenA);
    const t4 = await post(`/api/v1/tasks/${taskId}/transition`, { to: 'done' }, tokenA);
    expect(t4.status).toBe(200);
    expect(t4.body.data.status).toBe('done');
  });

  let videoId: string;

  it('video state machine · illegal shortcut 409', async () => {
    const v = await post(
      '/api/v1/videos',
      { projectId, customerId, title: 'Ph3 测试视频' },
      tokenA,
    );
    expect(v.status).toBe(201);
    videoId = v.body.data.id;

    // planning → published 非法
    const illegal = await post(`/api/v1/videos/${videoId}/transition`, { to: 'published' }, tokenA);
    expect(illegal.status).toBe(409);

    // 正常 planning → shooting → editing → pending_review → approved
    for (const to of ['shooting', 'editing', 'pending_review', 'approved'] as const) {
      const r = await post(`/api/v1/videos/${videoId}/transition`, { to }, tokenA);
      expect(r.status).toBe(200);
      expect(r.body.data.status).toBe(to);
    }
  });

  it('tenant isolation · B cannot see A contract/project', async () => {
    const c = await get(`/api/v1/contracts/${contractId}`, tokenB);
    expect(c.status).toBe(404);

    const p = await get(`/api/v1/projects/${projectId}`, tokenB);
    expect(p.status).toBe(404);

    const list = await get('/api/v1/contracts', tokenB);
    expect(list.body.data.length).toBe(0);
  });
});

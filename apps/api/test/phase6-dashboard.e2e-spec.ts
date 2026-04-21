import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { existsSync, unlinkSync } from 'node:fs';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { CustomerEntity } from '../src/modules/customers/entities/customer.entity';
import { ContractEntity } from '../src/modules/contracts/entities/contract.entity';
import { PaymentEntity } from '../src/modules/contracts/entities/payment.entity';

describe('Phase 6 · Renewal / Churn / Dashboard (e2e)', () => {
  let app: INestApplication;
  const sqlitePath = 'test-phase6.sqlite';

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
    process.env.JWT_SECRET = 'phase-6-secret';
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
  let tenantA: string;
  let customerId: string;
  let contractId: string;

  it('register tenant + create customer with delivering stage', async () => {
    const a = await post('/api/v1/auth/register-tenant', {
      companyName: 'Ph6 A', plan: 'pro', adminName: '老 A',
      phone: '13800600001', password: 'Ph6Pass1234',
    });
    expect(a.status).toBe(201);
    tokenA = a.body.data.accessToken;
    tenantA = a.body.data.user.tenantId;

    // 直接在 DB 中构造 delivering 客户 + signed 合同（避免走完整 S1-S5 流）
    const ds = app.get(DataSource);
    const customer = await ds.getRepository(CustomerEntity).save({
      tenantId: tenantA,
      companyName: 'Ph6 客户', bossName: '老板', bossPhone: '13800601001',
      industry: '餐饮', stage: 'delivering',
      healthScore: 70, healthLevel: 'yellow',
      contractExpiresAt: new Date(Date.now() + 15 * 86400_000), // 15 天后到期
    });
    customerId = customer.id;
    const contract = await ds.getRepository(ContractEntity).save({
      tenantId: tenantA,
      customerId: customer.id,
      contractNo: 'CT-TEST-001',
      totalAmount: 3000000,
      status: 'signed',
      bodySnapshot: '测试合同',
      signedAt: new Date(Date.now() - 60 * 86400_000),
    });
    contractId = contract.id;

    // 已付一笔款（供 cashflow）
    await ds.getRepository(PaymentEntity).save({
      tenantId: tenantA, contractId: contract.id, customerId: customer.id,
      stage: 'plan', ratio: 0.2, amount: 600000,
      status: 'paid', paidAt: new Date(),
    });
  });

  it('goals upsert + current', async () => {
    const res = await post(
      '/api/v1/goals',
      {
        newCustomers: 10, renewalCustomers: 15, churnRedLine: 3,
        targetRevenue: 500000, targetArpu: 250000,
      },
      tokenA,
    );
    expect([200, 201]).toContain(res.status);

    const cur = await get('/api/v1/goals', tokenA);
    expect(cur.body.data.newCustomers).toBe(10);
  });

  it('renewal scan creates warning for expiring customer', async () => {
    const res = await post('/api/v1/renewals/scan', {}, tokenA);
    expect(res.status).toBe(200);
    const list = (res.body.data as Array<{ customerId: string }>);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].customerId).toBe(customerId);

    // customer 已经从 delivering 推到 renewing
    const c = await get(`/api/v1/customers/${customerId}`, tokenA);
    expect(c.body.data.stage).toBe('renewing');
  });

  let renewalId: string;

  it('renewal board + generate proposal', async () => {
    const board = await get('/api/v1/renewals/board', tokenA);
    expect(board.status).toBe(200);
    expect(board.body.data.length).toBeGreaterThanOrEqual(1);
    renewalId = board.body.data[0].id;

    const proposal = await post(`/api/v1/renewals/${renewalId}/generate-proposal`, {}, tokenA);
    expect(proposal.status).toBe(200);
    expect(proposal.body.data.proposal).toContain('续约提案');
    expect(proposal.body.data.stage).toBe('negotiating');
  });

  it('negotiation notes', async () => {
    const add = await post(
      `/api/v1/renewals/${renewalId}/notes`,
      { channel: 'phone', notes: '电话沟通，客户倾向续约' },
      tokenA,
    );
    expect(add.status).toBe(201);

    const list = await get(`/api/v1/renewals/${renewalId}/notes`, tokenA);
    expect(list.body.data.length).toBe(1);
  });

  it('mark renewal won → customer.stage back to delivering', async () => {
    const res = await post(`/api/v1/renewals/${renewalId}/won`, {}, tokenA);
    expect(res.status).toBe(200);
    expect(res.body.data.stage).toBe('won');

    const c = await get(`/api/v1/customers/${customerId}`, tokenA);
    expect(c.body.data.stage).toBe('delivering');
  });

  it('lost renewal + churn record', async () => {
    // 创建另一个到期客户用来流失
    const ds = app.get(DataSource);
    const c2 = await ds.getRepository(CustomerEntity).save({
      tenantId: tenantA,
      companyName: 'Ph6 流失客户', bossName: '老 L', bossPhone: '13800601002',
      industry: '餐饮', stage: 'renewing',
      healthScore: 45, healthLevel: 'red',
      contractExpiresAt: new Date(Date.now() + 20 * 86400_000),
    });
    const contract2 = await ds.getRepository(ContractEntity).save({
      tenantId: tenantA, customerId: c2.id,
      contractNo: 'CT-TEST-002', totalAmount: 2000000, status: 'signed',
      bodySnapshot: '', signedAt: new Date(),
    });
    await post('/api/v1/renewals/scan', {}, tokenA);

    const board = await get('/api/v1/renewals/board', tokenA);
    const r = (board.body.data as Array<{ id: string; customerId: string }>).find(
      (x) => x.customerId === c2.id,
    );
    expect(r).toBeTruthy();

    const lost = await post(
      `/api/v1/renewals/${r!.id}/lost`,
      { reason: 'effect', analysis: '3 个月未见显著增长' },
      tokenA,
    );
    expect(lost.status).toBe(200);

    // 再创建 churn 记录
    const churn = await post(
      '/api/v1/churn',
      { customerId: c2.id, renewalId: r!.id, reason: 'effect', interviewNotes: '细节' },
      tokenA,
    );
    expect(churn.status).toBe(201);

    const c2After = await get(`/api/v1/customers/${c2.id}`, tokenA);
    expect(c2After.body.data.stage).toBe('churned');
  });

  it('dashboard returns all 5 modules', async () => {
    const res = await get('/api/v1/dashboard', tokenA);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.lights).toBeTruthy();
    expect(d.lights.green.count + d.lights.yellow.count + d.lights.red.count).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(d.capacity.byRole)).toBe(true);
    expect(d.kpi.newCustomers.target).toBe(10);
    expect(d.cashflow.incomeCents).toBeGreaterThanOrEqual(600000);
    expect(Array.isArray(d.decisions)).toBe(true);
  });

  it('daily decisions surfaces overdue payments', async () => {
    // 造一笔逾期付款
    const ds = app.get(DataSource);
    await ds.getRepository(PaymentEntity).save({
      tenantId: tenantA, contractId, customerId,
      stage: 'shoot', ratio: 0.4, amount: 1200000,
      status: 'overdue',
      dueAt: new Date(Date.now() - 10 * 86400_000),
    });

    const res = await get('/api/v1/dashboard/daily-decisions', tokenA);
    const hasPay = (res.body.data as Array<{ type: string }>).some(
      (d) => d.type === 'payment-overdue',
    );
    expect(hasPay).toBe(true);
  });

  it('churn analytics aggregates by reason', async () => {
    const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const res = await get(`/api/v1/churn/analytics?month=${month}`, tokenA);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data.byReason.effect).toBeGreaterThanOrEqual(1);
  });

  it('tenant isolation · B cannot see A dashboard data', async () => {
    const b = await post('/api/v1/auth/register-tenant', {
      companyName: 'Ph6 B', plan: 'basic', adminName: '老 B',
      phone: '13800600002', password: 'Ph6Pass1234',
    });
    const tokenB = b.body.data.accessToken;

    const bDash = await get('/api/v1/dashboard', tokenB);
    expect(bDash.status).toBe(200);
    expect(bDash.body.data.lights.green.count + bDash.body.data.lights.yellow.count + bDash.body.data.lights.red.count).toBe(0);
    expect(bDash.body.data.cashflow.incomeCents).toBe(0);
  });
});

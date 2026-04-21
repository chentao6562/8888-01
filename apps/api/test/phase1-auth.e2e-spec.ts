import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { unlinkSync, existsSync } from 'node:fs';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

/**
 * Phase 1 验收 e2e：
 * - 注册 2 家公司（A/B）
 * - 租户隔离：A 看不到 B 的 staff
 * - RBAC：策划角色不能删员工
 * - 邀请流程：invite → accept-invite → login
 * - 登录失败计数
 */
describe('Phase 1 · Auth / Tenant / RBAC (e2e)', () => {
  let app: INestApplication;

  const sqlitePath = 'test-phase1.sqlite';

  const register = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/api/v1/auth/register-tenant').send(body);

  const login = (phone: string, password: string) =>
    request(app.getHttpServer()).post('/api/v1/auth/login').send({ phone, password });

  const accept = (token: string, password: string) =>
    request(app.getHttpServer()).post('/api/v1/auth/accept-invite').send({ token, password });

  const invite = (bearer: string, body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/api/v1/staff/invite')
      .set('Authorization', `Bearer ${bearer}`)
      .send(body);

  const listStaff = (bearer: string) =>
    request(app.getHttpServer()).get('/api/v1/staff').set('Authorization', `Bearer ${bearer}`);

  beforeAll(async () => {
    if (existsSync(sqlitePath)) unlinkSync(sqlitePath);
    process.env.DB_DRIVER = 'sqlite';
    process.env.DB_SQLITE_PATH = sqlitePath;
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

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

  it('health is public', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('unauthenticated → 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/staff');
    expect(res.status).toBe(401);
  });

  it('register tenant A (admin)', async () => {
    const res = await register({
      companyName: 'A 公司',
      plan: 'basic',
      adminName: '老 A',
      phone: '13000000001',
      password: 'AaPass1234',
      contactEmail: 'a@example.com',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.role).toBe('admin');
    tokenA = res.body.data.accessToken;
  });

  it('register tenant B (admin)', async () => {
    const res = await register({
      companyName: 'B 公司',
      plan: 'pro',
      adminName: '老 B',
      phone: '13000000002',
      password: 'BbPass1234',
    });
    expect(res.status).toBe(201);
    tokenB = res.body.data.accessToken;
  });

  it('cannot re-register with same phone', async () => {
    const res = await register({
      companyName: 'X 公司',
      plan: 'basic',
      adminName: '某 X',
      phone: '13000000001',
      password: 'XxPass1234',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('USER_PHONE_TAKEN');
  });

  it('password weak → 400', async () => {
    const res = await register({
      companyName: 'W',
      plan: 'basic',
      adminName: 'W',
      phone: '13000000099',
      password: 'short1',
    });
    expect(res.status).toBe(400);
  });

  it('tenant A sees only itself', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/tenants/current')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('A 公司');
    expect(res.body.data.plan).toBe('basic');
  });

  it('tenant isolation: B sees only B staff', async () => {
    const [a, b] = await Promise.all([listStaff(tokenA), listStaff(tokenB)]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body.data).toHaveLength(1);
    expect(b.body.data).toHaveLength(1);
    expect(a.body.data[0].phone).toBe('13000000001');
    expect(b.body.data[0].phone).toBe('13000000002');
  });

  let inviteToken: string;

  it('admin invites a strategist', async () => {
    const res = await invite(tokenA, {
      name: '小 S',
      phone: '13000000011',
      role: 'strategist',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('invited');
    expect(res.body.data.inviteToken).toBeDefined();
    inviteToken = res.body.data.inviteToken as string;
  });

  it('invitee accepts & gets token', async () => {
    const res = await accept(inviteToken, 'Strat1234');
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('strategist');
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('invite token cannot be reused', async () => {
    const res = await accept(inviteToken, 'Another1234');
    // token has been consumed → 404 (记录消失) 或 409 (状态冲突)。均属合理行为。
    expect([400, 404, 409]).toContain(res.status);
  });

  it('RBAC: strategist cannot invite', async () => {
    const login1 = await login('13000000011', 'Strat1234');
    expect(login1.status).toBe(200);
    const stratToken = login1.body.data.accessToken;
    const res = await invite(stratToken, {
      name: '他人',
      phone: '13000000033',
      role: 'pm',
    });
    expect(res.status).toBe(403);
  });

  it('login fail path: wrong password', async () => {
    const res = await login('13000000001', 'wrong');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('locks account after 5 failed logins', async () => {
    for (let i = 0; i < 5; i++) {
      await login('13000000002', 'wrong');
    }
    const res = await login('13000000002', 'BbPass1234');
    expect([401, 403]).toContain(res.status);
    expect(['ACCOUNT_LOCKED', 'INVALID_CREDENTIALS']).toContain(res.body.error.code);
  });
});

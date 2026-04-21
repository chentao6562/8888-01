/**
 * Phase 1 种子数据：2 个租户 × 3 员工（1 admin + 2 其他角色）。
 * 手工 node 跑：
 *   pnpm --filter @mindlink/api exec ts-node src/seeds/phase-1.ts
 * 或：
 *   pnpm --filter @mindlink/api seed:phase-1
 *
 * 所有种子账户密码：Passw0rd!
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '@/modules/users/entities/user.entity';
import { TenantEntity, PLAN_MAX_STAFF } from '@/modules/tenants/entities/tenant.entity';
import { StaffEntity } from '@/modules/staff/entities/staff.entity';
import { AuditLogEntity } from '@/modules/audit/entities/audit-log.entity';

const COMMON_PASSWORD = 'Passw0rd!';

async function run() {
  const isProd = process.env.NODE_ENV === 'production';
  const driver = process.env.DB_DRIVER ?? (isProd ? 'postgres' : 'sqlite');

  const ds = new DataSource(
    driver === 'postgres'
      ? {
          type: 'postgres',
          host: process.env.DB_HOST ?? 'localhost',
          port: Number(process.env.DB_PORT ?? 5432),
          username: process.env.DB_USERNAME ?? 'mindlink',
          password: process.env.DB_PASSWORD ?? 'mindlink_dev',
          database: process.env.DB_DATABASE ?? 'mindlink',
          entities: [UserEntity, TenantEntity, StaffEntity, AuditLogEntity],
          synchronize: true,
        }
      : {
          type: 'better-sqlite3',
          database: process.env.DB_SQLITE_PATH ?? 'dev.sqlite',
          entities: [UserEntity, TenantEntity, StaffEntity, AuditLogEntity],
          synchronize: true,
        },
  );

  await ds.initialize();
  console.info('DB connected. Seeding...');

  const passwordHash = await bcrypt.hash(COMMON_PASSWORD, 10);

  // 清理同手机号避免重复
  const phones = [
    '13900000001', '13900000002', '13900000003',
    '13900000101', '13900000102', '13900000103',
  ];
  for (const phone of phones) {
    await ds.getRepository(UserEntity).delete({ phone });
  }
  await ds
    .getRepository(TenantEntity)
    .createQueryBuilder()
    .delete()
    .where('name IN (:...names)', { names: ['呼市老彭代运营 (Seed A)', '包头新媒体 (Seed B)'] })
    .execute();

  // Tenant A
  const tenantA = await ds.getRepository(TenantEntity).save({
    name: '呼市老彭代运营 (Seed A)',
    plan: 'pro' as const,
    maxStaff: PLAN_MAX_STAFF.pro,
    status: 'active' as const,
    contactPhone: '13900000001',
  });
  const adminA = await ds.getRepository(UserEntity).save({ phone: '13900000001', passwordHash });
  const pmA = await ds.getRepository(UserEntity).save({ phone: '13900000002', passwordHash });
  const stA = await ds.getRepository(UserEntity).save({ phone: '13900000003', passwordHash });

  const staffAdminA = await ds.getRepository(StaffEntity).save({
    tenantId: tenantA.id,
    userId: adminA.id,
    name: '老彭',
    phone: '13900000001',
    role: 'admin' as const,
    status: 'active' as const,
    joinedAt: new Date(),
  });
  tenantA.ownerId = staffAdminA.id;
  await ds.getRepository(TenantEntity).save(tenantA);

  await ds.getRepository(StaffEntity).save({
    tenantId: tenantA.id,
    userId: pmA.id,
    name: '小 P',
    phone: '13900000002',
    role: 'pm' as const,
    status: 'active' as const,
    joinedAt: new Date(),
  });
  await ds.getRepository(StaffEntity).save({
    tenantId: tenantA.id,
    userId: stA.id,
    name: '小 S',
    phone: '13900000003',
    role: 'strategist' as const,
    status: 'active' as const,
    joinedAt: new Date(),
  });

  // Tenant B
  const tenantB = await ds.getRepository(TenantEntity).save({
    name: '包头新媒体 (Seed B)',
    plan: 'basic' as const,
    maxStaff: PLAN_MAX_STAFF.basic,
    status: 'active' as const,
    contactPhone: '13900000101',
  });
  const adminB = await ds.getRepository(UserEntity).save({ phone: '13900000101', passwordHash });
  const cB = await ds.getRepository(UserEntity).save({ phone: '13900000102', passwordHash });
  const adB = await ds.getRepository(UserEntity).save({ phone: '13900000103', passwordHash });

  const staffAdminB = await ds.getRepository(StaffEntity).save({
    tenantId: tenantB.id,
    userId: adminB.id,
    name: '老赵',
    phone: '13900000101',
    role: 'admin' as const,
    status: 'active' as const,
    joinedAt: new Date(),
  });
  tenantB.ownerId = staffAdminB.id;
  await ds.getRepository(TenantEntity).save(tenantB);

  await ds.getRepository(StaffEntity).save({
    tenantId: tenantB.id,
    userId: cB.id,
    name: '小 C',
    phone: '13900000102',
    role: 'creator' as const,
    status: 'active' as const,
    joinedAt: new Date(),
  });
  await ds.getRepository(StaffEntity).save({
    tenantId: tenantB.id,
    userId: adB.id,
    name: '小 A',
    phone: '13900000103',
    role: 'adops' as const,
    status: 'active' as const,
    joinedAt: new Date(),
  });

  console.info(`\n✓ 种子完成`);
  console.info(`  Tenant A (${tenantA.name}) · plan=pro · owner=13900000001 / ${COMMON_PASSWORD}`);
  console.info(`    其他：13900000002 (pm) · 13900000003 (strategist)`);
  console.info(`  Tenant B (${tenantB.name}) · plan=basic · owner=13900000101 / ${COMMON_PASSWORD}`);
  console.info(`    其他：13900000102 (creator) · 13900000103 (adops)`);

  await ds.destroy();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

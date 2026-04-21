/**
 * Phase 2 种子：
 * 1. 默认 3 个官方套餐（starter_pack / monthly_package / annual_partner，tenantId = null）
 * 2. 给现有 2 个租户各自新增 5 个不同阶段的客户（lead/diagnosing/proposing/signed/delivering）
 *
 * 跑法：
 *   pnpm --filter @mindlink/api seed:phase-2
 *
 * 前置：先 `seed:phase-1` 或已有租户数据。
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { UserEntity } from '@/modules/users/entities/user.entity';
import { TenantEntity } from '@/modules/tenants/entities/tenant.entity';
import { StaffEntity } from '@/modules/staff/entities/staff.entity';
import { AuditLogEntity } from '@/modules/audit/entities/audit-log.entity';
import { CustomerEntity } from '@/modules/customers/entities/customer.entity';
import { LeadFollowUpEntity } from '@/modules/customers/entities/lead-follow-up.entity';
import { DiagnosisReportEntity } from '@/modules/diagnosis/entities/diagnosis-report.entity';
import { PackageEntity } from '@/modules/proposals/entities/package.entity';
import { PositioningBookEntity } from '@/modules/proposals/entities/positioning-book.entity';
import { UploadEntity } from '@/modules/uploads/entities/upload.entity';

const ENTITIES = [
  UserEntity,
  TenantEntity,
  StaffEntity,
  AuditLogEntity,
  CustomerEntity,
  LeadFollowUpEntity,
  DiagnosisReportEntity,
  PackageEntity,
  PositioningBookEntity,
  UploadEntity,
];

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
          entities: ENTITIES,
          synchronize: true,
        }
      : {
          type: 'better-sqlite3',
          database: process.env.DB_SQLITE_PATH ?? 'dev.sqlite',
          entities: ENTITIES,
          synchronize: true,
        },
  );
  await ds.initialize();
  console.info('DB connected. Seeding phase-2...');

  await seedPackages(ds);

  const tenants = await ds.getRepository(TenantEntity).find();
  if (tenants.length === 0) {
    console.warn('没有租户 —— 请先运行 `pnpm seed:phase-1`。');
    await ds.destroy();
    return;
  }

  for (const t of tenants) {
    await seedCustomersFor(ds, t.id);
  }

  console.info('\n✓ Phase 2 种子完成');
  await ds.destroy();
}

async function seedPackages(ds: DataSource) {
  const repo = ds.getRepository(PackageEntity);
  const existing = await repo.count({ where: [{ tenantId: null as unknown as string }] });
  if (existing > 0) {
    console.info('  官方套餐已存在，跳过');
    return;
  }
  await repo.save([
    {
      tenantId: null,
      tier: 'starter_pack',
      name: '矩阵起号包',
      description: '一次性：诊断 + 定位 + 9 条测试视频 + 矩阵表',
      scope: JSON.stringify({ videos: 9, months: 1, includes: ['诊断', '定位书', '矩阵表'] }),
      priceMin: 600_000,
      priceMax: 1_500_000,
      periodMonths: 1,
      targetIndustries: JSON.stringify(['餐饮', '美业', '零售']),
    },
    {
      tenantId: null,
      tier: 'monthly_package',
      name: '月度代运营包',
      description: '每月：18-30 条视频 + 投流 + 数据报告',
      scope: JSON.stringify({ videos: 24, months: 1, includes: ['拍摄', '剪辑', '投流', '月报'] }),
      priceMin: 1_500_000,
      priceMax: 3_000_000,
      periodMonths: 1,
      targetIndustries: JSON.stringify(['餐饮', '美业', '零售', '教培']),
    },
    {
      tenantId: null,
      tier: 'annual_partner',
      name: '年度合伙人包',
      description: '全年：全链路代运营 + 业绩对赌分成',
      scope: JSON.stringify({ videos: 240, months: 12, includes: ['全链路', '业绩对赌'] }),
      priceMin: 8_000_000,
      priceMax: 30_000_000,
      periodMonths: 12,
      targetIndustries: JSON.stringify(['餐饮', '零售', '头部客户']),
    },
  ]);
  console.info('  ✓ 3 个官方套餐');
}

async function seedCustomersFor(ds: DataSource, tenantId: string) {
  const repo = ds.getRepository(CustomerEntity);
  const existing = await repo.count({ where: { tenantId } });
  if (existing > 0) {
    console.info(`  tenant ${tenantId.slice(0, 8)}… 已有 ${existing} 客户，跳过`);
    return;
  }
  const staff = await ds.getRepository(StaffEntity).find({ where: { tenantId, status: 'active' } });
  const pm = staff.find((s) => s.role === 'pm');
  const strategist = staff.find((s) => s.role === 'strategist');

  const rows: Partial<CustomerEntity>[] = [
    {
      tenantId,
      companyName: '呼市金辉家居',
      bossName: '张总',
      bossPhone: '13811110001',
      industry: '家居零售',
      region: '内蒙古呼和浩特 · 金桥开发区',
      source: 'website',
      budgetHint: 'gt_30k',
      stage: 'lead',
      healthScore: 70,
      healthLevel: 'green',
      strategistId: strategist?.id ?? null,
    },
    {
      tenantId,
      companyName: '本原瑜伽馆',
      bossName: '林老师',
      bossPhone: '13811110002',
      industry: '运动健康',
      region: '内蒙古呼和浩特 · 赛罕区',
      source: 'referral',
      budgetHint: '10k_30k',
      stage: 'diagnosing',
      healthScore: 75,
      healthLevel: 'green',
      strategistId: strategist?.id ?? null,
      pmId: pm?.id ?? null,
    },
    {
      tenantId,
      companyName: '二大妈河套美食村',
      bossName: '穆总',
      bossPhone: '13811110003',
      industry: '餐饮',
      region: '内蒙古呼和浩特 · 回民区',
      source: 'outreach',
      budgetHint: '10k_30k',
      stage: 'proposing',
      healthScore: 78,
      healthLevel: 'green',
      strategistId: strategist?.id ?? null,
      pmId: pm?.id ?? null,
    },
    {
      tenantId,
      companyName: '长虹驾校',
      bossName: '王校长',
      bossPhone: '13811110004',
      industry: '教培',
      region: '内蒙古呼和浩特 · 玉泉区',
      source: 'referral',
      budgetHint: 'gt_30k',
      stage: 'signed',
      healthScore: 82,
      healthLevel: 'green',
      strategistId: strategist?.id ?? null,
      pmId: pm?.id ?? null,
    },
    {
      tenantId,
      companyName: '酥河点心那达慕',
      bossName: '老彭',
      bossPhone: '13811110005',
      industry: '面包甜点',
      region: '内蒙古呼和浩特 · 回民区',
      source: 'ad',
      budgetHint: '10k_30k',
      stage: 'delivering',
      healthScore: 92,
      healthLevel: 'green',
      strategistId: strategist?.id ?? null,
      pmId: pm?.id ?? null,
    },
  ];

  for (const row of rows) {
    const c = repo.create(row);
    await repo.save(c);
  }
  console.info(`  ✓ tenant ${tenantId.slice(0, 8)}… +5 客户（lead→delivering 各阶段）`);
}

run().catch((err) => {
  console.error('Seed phase-2 failed:', err);
  process.exit(1);
});

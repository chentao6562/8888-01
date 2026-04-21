/**
 * Phase 4 种子：
 *  1. 10 条官方案例（5 文案 + 5 标题，tenantId=null）
 *  2. 每个租户 10 条私库案例（混合 copy/title 类别）
 *
 * 跑法：
 *   pnpm --filter @mindlink/api seed:phase-4
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
import { ContractEntity } from '@/modules/contracts/entities/contract.entity';
import { ContractTemplateEntity } from '@/modules/contracts/entities/contract-template.entity';
import { PaymentEntity } from '@/modules/contracts/entities/payment.entity';
import { ProjectEntity } from '@/modules/projects/entities/project.entity';
import { KickoffMeetingEntity } from '@/modules/projects/entities/kickoff-meeting.entity';
import { TaskEntity } from '@/modules/tasks/entities/task.entity';
import { VideoEntity } from '@/modules/videos/entities/video.entity';
import { CaseEntity, CaseCategory } from '@/modules/cases/entities/case.entity';
import { LlmUsageLogEntity } from '@/modules/llm/entities/llm-usage-log.entity';

const ENTITIES = [
  UserEntity, TenantEntity, StaffEntity, AuditLogEntity,
  CustomerEntity, LeadFollowUpEntity, DiagnosisReportEntity,
  PackageEntity, PositioningBookEntity, UploadEntity,
  ContractEntity, ContractTemplateEntity, PaymentEntity,
  ProjectEntity, KickoffMeetingEntity, TaskEntity, VideoEntity,
  CaseEntity, LlmUsageLogEntity,
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
          entities: ENTITIES, synchronize: true,
        }
      : {
          type: 'better-sqlite3',
          database: process.env.DB_SQLITE_PATH ?? 'dev.sqlite',
          entities: ENTITIES, synchronize: true,
        },
  );
  await ds.initialize();
  console.info('DB connected. Seeding phase-4...');

  await seedOfficialCases(ds);
  const tenants = await ds.getRepository(TenantEntity).find();
  for (const t of tenants) await seedPrivateCases(ds, t.id);

  console.info('\n✓ Phase 4 种子完成');
  await ds.destroy();
}

async function seedOfficialCases(ds: DataSource) {
  const repo = ds.getRepository(CaseEntity);
  const already = await repo.count({ where: { tenantId: null as unknown as string } });
  if (already > 0) { console.info('  官方案例库已存在，跳过'); return; }

  const rows: Array<{ category: CaseCategory; title: string; content: string; industry?: string; tags?: string[] }> = [
    { category: 'copy', title: '老板讲故事 · 父女对话型', content: '【钩子】你真的吃过 15 年老店的点心吗？\n【主体】1999 年我女儿 5 岁，第一次吃咱家麻团哭了一下午……那以后每次配方我都不敢动。\n【CTA】老彭家地址发在评论区，今晚烤最后一炉。', industry: '餐饮', tags: ['老板IP', '故事型', '本地老店'] },
    { category: 'copy', title: '对比型 · 为什么选我们', content: '【钩子】同样 9.9 块钱的麻团，为什么我家排队？\n【主体】第一，180g/ 只比隔壁多 30%；第二，黑芝麻自己炒；第三，现炸绝不隔夜。\n【CTA】导航搜"老彭麻团" 今天来打卡。', industry: '餐饮', tags: ['对比', '爆品', '到店'] },
    { category: 'copy', title: '干货型 · 选驾校避坑清单', content: '【钩子】选驾校千万别只看价格\n【主体】1. 场地离家 5km 内 · 2. 一车限 4 人 · 3. 教练本月带过几个人。\n【CTA】想看我整理的"呼市驾校真实通过率" 评论扣 1', industry: '教培', tags: ['干货', '避坑', '清单'] },
    { category: 'copy', title: '幕后花絮型 · 晨间出炉', content: '【钩子】早上 4 点的老彭家什么样？\n【主体】面师傅 3:00 起 · 烤箱 4:00 进货 · 第一批麻团 5:10 出炉。\n【CTA】评论区蹲一句"几点去" 告诉你当天最早的那一炉', industry: '餐饮', tags: ['幕后', '晨间', '真实感'] },
    { category: 'copy', title: '客户见证型 · 带娃妈妈口播', content: '【钩子】作为两个娃的妈，我真的怕外面点心\n【主体】老彭家我推荐三点：1. 看得见后厨；2. 食材标签公开；3. 娃吃完第二天没上火。\n【CTA】关注不迷路，私信我要地址', industry: '餐饮', tags: ['客户见证', '宝妈'] },

    { category: 'title', title: '标题 · 数字 + 悬念', content: '这件事，90% 的呼市餐饮老板都做错了', industry: '餐饮', tags: ['数字', '悬念', '通用'] },
    { category: 'title', title: '标题 · 对话型', content: '老板亲自讲：15 年的店到底值不值', industry: '餐饮', tags: ['对话', '老板IP'] },
    { category: 'title', title: '标题 · 避雷清单', content: '别再踩坑！选驾校的 3 个真相', industry: '教培', tags: ['避雷', '清单'] },
    { category: 'title', title: '标题 · 地域词 + 行业', content: '呼和浩特本地人才知道的 5 家早点', industry: '餐饮', tags: ['地域', '本地'] },
    { category: 'title', title: '标题 · 反差型', content: '我劝你别买 9.9 的麻团（看完你再决定）', industry: '餐饮', tags: ['反差', '劝诫'] },
  ];
  for (const r of rows) {
    await repo.save(repo.create({
      tenantId: null,
      category: r.category,
      title: r.title,
      content: r.content,
      industry: r.industry ?? null,
      tags: r.tags ? JSON.stringify(r.tags) : null,
      metrics: JSON.stringify({ plays: 50000 + Math.floor(Math.random() * 150000), roi: 1 + Math.random() }),
      callCount: Math.floor(Math.random() * 30),
      freshness: 'fresh',
    }));
  }
  console.info('  ✓ 10 条官方案例（5 文案 + 5 标题）');
}

async function seedPrivateCases(ds: DataSource, tenantId: string) {
  const repo = ds.getRepository(CaseEntity);
  const existing = await repo.count({ where: { tenantId } });
  if (existing > 0) { console.info(`  tenant ${tenantId.slice(0, 8)}… 私库已存在，跳过`); return; }

  const rows: Array<{ category: CaseCategory; title: string; content: string }> = [
    { category: 'copy', title: '私库示例 · 客户反馈', content: '【钩子】客户半年回头 5 次\n【主体】真实反馈 + 数据\n【CTA】到店领小礼物' },
    { category: 'copy', title: '私库示例 · 季节限定', content: '【钩子】只卖 30 天的桂花麻团\n【主体】每年 9-10 月限定 · 去年 18000 只售罄\n【CTA】扫码预订' },
    { category: 'title', title: '标题 · 节日型', content: '中秋不走回头路，这 3 家呼市老店今年值得试' },
    { category: 'title', title: '标题 · 本地 + 干货', content: '呼市美业人都在看的 7 个选品逻辑' },
    { category: 'copy', title: '私库示例 · 幕后故事', content: '【钩子】凌晨 4 点我在厨房拍的\n【主体】细节真实感 + 手工感\n【CTA】给我点个赞' },
    { category: 'title', title: '标题 · 问题式', content: '为什么呼市的老店都不开分店？' },
    { category: 'copy', title: '私库示例 · 限定活动', content: '【钩子】这周限定 \n【主体】老客户专享 \n【CTA】私信领' },
    { category: 'title', title: '标题 · 成本型', content: '我把做一条爆款视频的成本，公开给你看' },
    { category: 'copy', title: '私库示例 · 行业对比', content: '【钩子】同价位对比\n【主体】三家同价位服务对比\n【CTA】到店体验' },
    { category: 'title', title: '标题 · 数据型', content: '半年带来 200+ 到店的 3 个视频套路' },
  ];
  for (const r of rows) {
    await repo.save(repo.create({
      tenantId,
      category: r.category,
      title: r.title,
      content: r.content,
      industry: null,
      tags: null,
      metrics: null,
      callCount: Math.floor(Math.random() * 15),
      freshness: 'fresh',
    }));
  }
  console.info(`  ✓ tenant ${tenantId.slice(0, 8)}… 私库 +10 案例`);
}

run().catch((e) => { console.error('Seed phase-4 failed:', e); process.exit(1); });

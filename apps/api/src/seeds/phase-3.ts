/**
 * Phase 3 种子：
 * 1. 3 个官方合同模板（对应 3 个套餐档位）
 * 2. 为每个租户的"长虹驾校"（stage=signed）生成合同 + 4 笔付款 + 项目 + 启动会定稿 + 5 任务 + 3 视频
 *
 * 跑法：
 *   pnpm --filter @mindlink/api seed:phase-3
 *
 * 前置：已跑 phase-1 + phase-2。
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
import { PaymentEntity, PAYMENT_RATIOS } from '@/modules/contracts/entities/payment.entity';
import { ProjectEntity } from '@/modules/projects/entities/project.entity';
import { KickoffMeetingEntity } from '@/modules/projects/entities/kickoff-meeting.entity';
import { TaskEntity } from '@/modules/tasks/entities/task.entity';
import { VideoEntity } from '@/modules/videos/entities/video.entity';

const ENTITIES = [
  UserEntity, TenantEntity, StaffEntity, AuditLogEntity,
  CustomerEntity, LeadFollowUpEntity, DiagnosisReportEntity,
  PackageEntity, PositioningBookEntity, UploadEntity,
  ContractEntity, ContractTemplateEntity, PaymentEntity,
  ProjectEntity, KickoffMeetingEntity, TaskEntity, VideoEntity,
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
  console.info('DB connected. Seeding phase-3...');

  await seedTemplates(ds);

  const tenants = await ds.getRepository(TenantEntity).find();
  if (tenants.length === 0) {
    console.warn('没有租户 —— 请先跑 phase-1。');
    await ds.destroy();
    return;
  }
  for (const t of tenants) {
    await seedContractForTenant(ds, t.id);
  }

  console.info('\n✓ Phase 3 种子完成');
  await ds.destroy();
}

async function seedTemplates(ds: DataSource) {
  const repo = ds.getRepository(ContractTemplateEntity);
  const existing = await repo.count({ where: [{ tenantId: null as unknown as string }] });
  if (existing > 0) {
    console.info('  官方合同模板已存在，跳过');
    return;
  }
  const body = [
    '# MindLink 代运营服务合同',
    '',
    '甲方：{{companyName}}  乙方：MindLink 代运营',
    '',
    '服务套餐：{{planTier}}',
    '合同总金额：¥ {{totalAmountYuan}}',
    '',
    '## 一、服务内容',
    '{{onePager}}',
    '',
    '## 二、付款方式',
    '采用"先拍后付"四笔制：策划 20% · 拍摄 40% · 剪辑 35% · 尾款 5%',
    '',
    '## 三、双方权责',
    '乙方按期交付；甲方 48h 内完成成片审核。',
    '',
    '## 四、违约',
    '任一方严重违约，另一方可书面通知终止合同。',
  ].join('\n');

  await repo.save([
    { tenantId: null, tier: 'starter_pack', name: '起号包合同模板 v1', body },
    { tenantId: null, tier: 'monthly_package', name: '月度代运营合同模板 v1', body },
    { tenantId: null, tier: 'annual_partner', name: '年度合伙人合同模板 v1', body },
  ]);
  console.info('  ✓ 3 个官方合同模板');
}

async function seedContractForTenant(ds: DataSource, tenantId: string) {
  const customers = await ds
    .getRepository(CustomerEntity)
    .find({ where: { tenantId, stage: 'signed' } });
  if (customers.length === 0) {
    console.info(`  tenant ${tenantId.slice(0, 8)}… 无 signed 客户，跳过 phase-3 数据`);
    return;
  }
  const customer = customers[0]; // 长虹驾校
  const existingContracts = await ds
    .getRepository(ContractEntity)
    .find({ where: { tenantId, customerId: customer.id } });
  if (existingContracts.length > 0) {
    console.info(`  tenant ${tenantId.slice(0, 8)}… 已有合同，跳过`);
    return;
  }

  // 给 customer 先建一个 signed 定位书（phase-2 seed 默认不生成方案）
  const proposalRepo = ds.getRepository(PositioningBookEntity);
  let proposal = await proposalRepo.findOne({
    where: { tenantId, customerId: customer.id, status: 'signed' },
  });
  if (!proposal) {
    proposal = proposalRepo.create({
      tenantId,
      customerId: customer.id,
      diagnosisReportId: null,
      version: 1,
      onePager: '一句话：面向本地学员的"教练人设 + 真实考场" IP 账号',
      content: '# 定位书 · 长虹驾校\n(phase-3 seed 预填)',
      planTier: 'monthly_package',
      priceQuote: 3000000,
      regionFactor: 1,
      status: 'signed',
      signedAt: new Date(),
    });
    proposal = await proposalRepo.save(proposal);
  }

  const staffList = await ds.getRepository(StaffEntity).find({ where: { tenantId } });
  const pm = staffList.find((s) => s.role === 'pm');
  const strategist = staffList.find((s) => s.role === 'strategist');
  const creator = staffList.find((s) => s.role === 'creator');
  const adops = staffList.find((s) => s.role === 'adops');

  const templates = await ds
    .getRepository(ContractTemplateEntity)
    .find({ where: [{ tenantId: null as unknown as string }] });
  const tpl = templates.find((t) => t.tier === proposal!.planTier) ?? templates[0];

  // 合同
  const totalAmount = proposal.priceQuote;
  const contractNo = `CT-SEED-${tenantId.slice(0, 4).toUpperCase()}-${customer.id.slice(0, 4)}`;
  const contract = await ds.getRepository(ContractEntity).save({
    tenantId,
    customerId: customer.id,
    proposalId: proposal.id,
    templateId: tpl?.id ?? null,
    contractNo,
    totalAmount,
    status: 'signed' as const,
    bodySnapshot: tpl?.body ?? '(seed 合同正文)',
    variablesSnapshot: JSON.stringify({ totalAmount }),
    signedAt: new Date(),
    esignOrderId: `mock-seed-${Date.now()}`,
  });

  // 4 笔付款
  const payments: PaymentEntity[] = [];
  let idx = 0;
  for (const r of PAYMENT_RATIOS) {
    const p = await ds.getRepository(PaymentEntity).save({
      tenantId,
      contractId: contract.id,
      customerId: customer.id,
      stage: r.stage,
      ratio: r.ratio,
      amount: Math.round(totalAmount * r.ratio),
      dueAt: new Date(Date.now() + (++idx) * 30 * 86400_000),
      status: idx === 1 ? 'paid' as const : 'pending' as const,
      paidAt: idx === 1 ? new Date() : null,
    });
    payments.push(p);
  }

  // 项目
  const project = await ds.getRepository(ProjectEntity).save({
    tenantId,
    customerId: customer.id,
    contractId: contract.id,
    name: `项目 · ${contract.contractNo}`,
    plan: 'monthly_package' as const,
    status: 'running' as const,
    pmId: pm?.id ?? null,
    startAt: new Date(),
    endAt: new Date(Date.now() + 90 * 86400_000),
  });
  contract.projectId = project.id;
  await ds.getRepository(ContractEntity).save(contract);

  // 启动会（finalized）
  await ds.getRepository(KickoffMeetingEntity).save({
    tenantId,
    projectId: project.id,
    status: 'finalized' as const,
    meetingAt: new Date(),
    goals: '月度 15 条视频 · 到店咨询 +30%',
    roles: JSON.stringify([
      { role: '策划', person: strategist?.name ?? '-', duty: '脚本 + 定位' },
      { role: 'PM', person: pm?.name ?? '-', duty: '进度 + 对接客户' },
      { role: '创作者', person: creator?.name ?? '-', duty: '拍摄 + 剪辑' },
      { role: '投手', person: adops?.name ?? '-', duty: '投流 + 数据' },
    ]),
    schedule: '第一周：3 条冷启动；第二周：爆款测试；第三周：放量',
    risks: JSON.stringify(['老板口播时间难约', '学员片段授权']),
    communicationRule: '微信群每日 19:00 日报 · 周五晚上周报',
  });

  // 5 任务（假设 staff 都存在）
  const tasks: Partial<TaskEntity>[] = [
    {
      tenantId, projectId: project.id, type: 'plan',
      title: '产出本月 3×3 内容矩阵表',
      assigneeId: strategist?.id ?? pm?.id ?? customer.id,
      status: 'done', completedAt: new Date(),
      dueAt: new Date(Date.now() - 3 * 86400_000),
    },
    {
      tenantId, projectId: project.id, type: 'shoot',
      title: '拍摄 · 老板故事型视频 × 3',
      assigneeId: creator?.id ?? pm?.id ?? customer.id,
      status: 'in_progress',
      dueAt: new Date(Date.now() + 2 * 86400_000),
    },
    {
      tenantId, projectId: project.id, type: 'edit',
      title: '剪辑 · 本周 5 条成片',
      assigneeId: creator?.id ?? pm?.id ?? customer.id,
      status: 'pending',
      dueAt: new Date(Date.now() + 5 * 86400_000),
    },
    {
      tenantId, projectId: project.id, type: 'publish',
      title: '发布 · 抖音 + 视频号同步',
      assigneeId: adops?.id ?? pm?.id ?? customer.id,
      status: 'pending',
      dueAt: new Date(Date.now() + 7 * 86400_000),
    },
    {
      tenantId, projectId: project.id, type: 'other',
      title: '本周数据复盘 · ROI 汇总',
      assigneeId: pm?.id ?? customer.id,
      status: 'pending',
      dueAt: new Date(Date.now() + 6 * 86400_000),
    },
  ];
  for (const t of tasks) {
    await ds.getRepository(TaskEntity).save(ds.getRepository(TaskEntity).create(t));
  }

  // 3 视频（planning / editing / pending_review）
  const videos: Partial<VideoEntity>[] = [
    {
      tenantId, projectId: project.id, customerId: customer.id,
      title: '老板讲 · 为什么选长虹',
      status: 'planning',
      strategistId: strategist?.id ?? null,
      script: '（策划中）',
    },
    {
      tenantId, projectId: project.id, customerId: customer.id,
      title: '学员一周练车 vlog',
      status: 'editing',
      strategistId: strategist?.id ?? null,
      creatorId: creator?.id ?? null,
      rawMaterialUrls: JSON.stringify([
        '/uploads/seed/vlog-clip-1.mp4',
        '/uploads/seed/vlog-clip-2.mp4',
      ]),
    },
    {
      tenantId, projectId: project.id, customerId: customer.id,
      title: '考场实拍 · 最紧张的 5 分钟',
      status: 'pending_review',
      strategistId: strategist?.id ?? null,
      creatorId: creator?.id ?? null,
      editorId: creator?.id ?? null,
      draftVideoUrl: '/uploads/seed/exam-draft-v2.mp4',
      reviewSubmittedAt: new Date(),
    },
  ];
  for (const v of videos) {
    await ds.getRepository(VideoEntity).save(ds.getRepository(VideoEntity).create(v));
  }

  // 把客户推进到 delivering
  if (customer.stage === 'signed') {
    customer.stage = 'delivering';
    await ds.getRepository(CustomerEntity).save(customer);
  }

  console.info(
    `  ✓ tenant ${tenantId.slice(0, 8)}… 合同${contract.contractNo} · 4笔付款 · 1项目 · 5任务 · 3视频`,
  );
}

run().catch((err) => {
  console.error('Seed phase-3 failed:', err);
  process.exit(1);
});

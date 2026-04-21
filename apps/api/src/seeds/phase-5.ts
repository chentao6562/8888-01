/**
 * Phase 5 种子：
 *  - 为 signed/delivering 客户填充近 3 月 × 3 视频 × 2 平台 × 随机日度数据
 *  - 创建 2 条月报（近 2 月 · 已发布状态）
 *  - 插入 1 条 NPS + 1 条投诉
 *  - 计算 1 月健康度快照
 *
 * 跑法：
 *   pnpm --filter @mindlink/api seed:phase-5
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
import { CaseEntity } from '@/modules/cases/entities/case.entity';
import { LlmUsageLogEntity } from '@/modules/llm/entities/llm-usage-log.entity';
import { VideoMetricEntity } from '@/modules/metrics/entities/video-metric.entity';
import { MonthlyReportEntity } from '@/modules/reports/entities/monthly-report.entity';
import { NpsRecordEntity } from '@/modules/nps/entities/nps-record.entity';
import { ComplaintEntity } from '@/modules/complaints/entities/complaint.entity';
import { HealthScoreSnapshotEntity, toLevel, HEALTH_WEIGHTS } from '@/modules/health-score/entities/health-score-snapshot.entity';

const ENTITIES = [
  UserEntity, TenantEntity, StaffEntity, AuditLogEntity,
  CustomerEntity, LeadFollowUpEntity, DiagnosisReportEntity,
  PackageEntity, PositioningBookEntity, UploadEntity,
  ContractEntity, ContractTemplateEntity, PaymentEntity,
  ProjectEntity, KickoffMeetingEntity, TaskEntity, VideoEntity,
  CaseEntity, LlmUsageLogEntity,
  VideoMetricEntity, MonthlyReportEntity, NpsRecordEntity, ComplaintEntity,
  HealthScoreSnapshotEntity,
];

async function run() {
  const isProd = process.env.NODE_ENV === 'production';
  const driver = process.env.DB_DRIVER ?? (isProd ? 'postgres' : 'sqlite');
  const ds = new DataSource(
    driver === 'postgres'
      ? {
          type: 'postgres', host: process.env.DB_HOST ?? 'localhost',
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
  console.info('DB connected. Seeding phase-5...');

  const tenants = await ds.getRepository(TenantEntity).find();
  for (const t of tenants) await seedForTenant(ds, t.id);

  console.info('\n✓ Phase 5 种子完成');
  await ds.destroy();
}

async function seedForTenant(ds: DataSource, tenantId: string) {
  // 取所有 delivering 客户（phase-3 seed 会把第一个 signed 推到 delivering）
  const customers = await ds.getRepository(CustomerEntity).find({
    where: [
      { tenantId, stage: 'delivering' },
      { tenantId, stage: 'reviewing' },
    ],
  });
  if (customers.length === 0) {
    console.info(`  tenant ${tenantId.slice(0, 8)}… 无交付中客户，跳过`);
    return;
  }
  const customer = customers[0];

  const videos = await ds.getRepository(VideoEntity).find({
    where: { tenantId, customerId: customer.id },
    take: 3,
  });
  if (videos.length === 0) {
    console.info(`  tenant ${tenantId.slice(0, 8)}… 无视频，跳过`);
    return;
  }

  // 幂等：检查是否已有本月 metrics
  const existing = await ds.getRepository(VideoMetricEntity).count({
    where: { tenantId, customerId: customer.id },
  });
  if (existing > 0) {
    console.info(`  tenant ${tenantId.slice(0, 8)}… metrics 已存在（${existing} 条），跳过填充`);
    return;
  }

  // === 3 月 × 3 视频 × 2 平台随机 metrics ===
  const now = new Date();
  const metricRepo = ds.getRepository(VideoMetricEntity);
  const months: string[] = [];
  for (let m = 2; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  for (const month of months) {
    for (const v of videos) {
      for (const platform of ['抖音', '视频号']) {
        // 每月 5 天数据
        for (let d = 1; d <= 25; d += 5) {
          const date = `${month}-${String(d).padStart(2, '0')}`;
          const plays = 3000 + Math.floor(Math.random() * 15000);
          const adSpend = 10000 + Math.floor(Math.random() * 50000);
          const roi = 0.8 + Math.random() * 1.5;
          await metricRepo.save(metricRepo.create({
            tenantId, videoId: v.id, customerId: customer.id,
            platform, date, plays,
            likes: Math.floor(plays * 0.04),
            comments: Math.floor(plays * 0.008),
            shares: Math.floor(plays * 0.006),
            collections: Math.floor(plays * 0.01),
            adSpend, roi: Number(roi.toFixed(2)),
          }));
        }
      }
    }
  }

  // === 2 月月报（上上月 + 上月 · 已推送） ===
  const reportRepo = ds.getRepository(MonthlyReportEntity);
  for (const month of months.slice(0, 2)) {
    await reportRepo.save(reportRepo.create({
      tenantId, customerId: customer.id, projectId: null,
      month, status: 'sent',
      aiDraft: `# ${month} AI 初稿 (seed)`,
      finalContent: [
        `# ${customer.companyName} · ${month} 月度报告`,
        '## 1. 本月总览',
        '流水增长 15% · 到店咨询 +30% · ROI 1.2',
        '## 2. 本月交付物',
        `发布视频 ${videos.length} 条`,
        '## 3. 流量分析',
        '抖音占 70%，视频号占 30%。',
        '## 4. 爆款拆解',
        '- 老板故事型 · 最高播放',
        '- 学员口碑型 · 最高互动',
        '- 考场实拍型 · 最高转化',
        '## 5. 未达标反思',
        '评论区运营不足，回复及时率待提升。',
        '## 6. 下月重点',
        '- 保持发布节奏 - 开设学员采访专栏 - 投流预算微调',
      ].join('\n\n'),
      sections: JSON.stringify({
        overview: { plays: 90000, roi: 1.2, adSpend: 300000 },
        deliverables: { videoCount: videos.length, topPlays: 22000 },
      }),
      pushedAt: new Date(),
    }));
  }

  // === NPS + 投诉 ===
  const npsRepo = ds.getRepository(NpsRecordEntity);
  const reports = await reportRepo.find({ where: { tenantId, customerId: customer.id } });
  if (reports.length > 0) {
    await npsRepo.save(npsRepo.create({
      tenantId, customerId: customer.id,
      reportId: reports[0].id,
      score: 8,
      comment: '月报做得挺细，希望投流预算更灵活',
    }));
  }
  const complaintRepo = ds.getRepository(ComplaintEntity);
  await complaintRepo.save(complaintRepo.create({
    tenantId, customerId: customer.id,
    severity: 'mid',
    content: '本月有一条视频客户反馈剪辑节奏偏慢',
    status: 'closed',
    handledAt: new Date(),
    resolution: '已让剪辑返工，通过审核',
    source: 'pm',
  }));

  // === 1 月健康度快照 ===
  const snapRepo = ds.getRepository(HealthScoreSnapshotEntity);
  const scores = { business: 85, delivery: 92, nps: 80, interaction: 70, complaint: 85 };
  const total = Math.round(
    scores.business * HEALTH_WEIGHTS.business +
    scores.delivery * HEALTH_WEIGHTS.delivery +
    scores.nps * HEALTH_WEIGHTS.nps +
    scores.interaction * HEALTH_WEIGHTS.interaction +
    scores.complaint * HEALTH_WEIGHTS.complaint,
  );
  await snapRepo.save(snapRepo.create({
    tenantId, customerId: customer.id, month: months[months.length - 1],
    totalScore: total,
    businessScore: scores.business,
    deliveryScore: scores.delivery,
    npsScore: scores.nps,
    interactionScore: scores.interaction,
    complaintScore: scores.complaint,
    level: toLevel(total),
  }));
  // 回写客户
  customer.healthScore = total;
  customer.healthLevel = toLevel(total);
  await ds.getRepository(CustomerEntity).save(customer);

  console.info(
    `  ✓ tenant ${tenantId.slice(0, 8)}… metrics(3m × ${videos.length}v × 2p × 5d) · 月报 2 · NPS 1 · 投诉 1 · 健康度 ${total} (${toLevel(total)})`,
  );
}

run().catch((e) => { console.error('Seed phase-5 failed:', e); process.exit(1); });

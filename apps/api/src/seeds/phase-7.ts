/**
 * Phase 7 种子 · 客户端（小程序）演示数据：
 *  1. 给每租户的 delivering 客户创建一个 CustomerUser（openid=dev:{bossPhone}），供 devLogin 使用
 *  2. 给 delivering 客户添加一条 pending_review 视频（若尚无）
 *  3. 给 delivering 客户补一条上月 sent 月报（未读）供小程序展示
 *
 * 跑法：
 *   pnpm --filter @mindlink/api seed:phase-7
 *
 * 前置：先 seed:phase-1 / phase-2 / phase-3（保证 delivering 客户 + project + contract 已存在）。
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
import { VideoCommentEntity } from '@/modules/videos/entities/video-comment.entity';
import { CaseEntity } from '@/modules/cases/entities/case.entity';
import { LlmUsageLogEntity } from '@/modules/llm/entities/llm-usage-log.entity';
import { VideoMetricEntity } from '@/modules/metrics/entities/video-metric.entity';
import { MonthlyReportEntity } from '@/modules/reports/entities/monthly-report.entity';
import { NpsRecordEntity } from '@/modules/nps/entities/nps-record.entity';
import { ComplaintEntity } from '@/modules/complaints/entities/complaint.entity';
import { HealthScoreSnapshotEntity } from '@/modules/health-score/entities/health-score-snapshot.entity';
import {
  RenewalRecordEntity,
  NegotiationNoteEntity,
} from '@/modules/renewals/entities/renewal-record.entity';
import { ChurnRecordEntity } from '@/modules/churn/entities/churn-record.entity';
import { CompanyGoalEntity } from '@/modules/goals/entities/company-goal.entity';
import { CustomerUserEntity } from '@/modules/client-users/entities/customer-user.entity';
import { InvoiceRequestEntity } from '@/modules/client-users/entities/invoice-request.entity';

const ENTITIES = [
  UserEntity, TenantEntity, StaffEntity, AuditLogEntity,
  CustomerEntity, LeadFollowUpEntity, DiagnosisReportEntity,
  PackageEntity, PositioningBookEntity, UploadEntity,
  ContractEntity, ContractTemplateEntity, PaymentEntity,
  ProjectEntity, KickoffMeetingEntity, TaskEntity, VideoEntity, VideoCommentEntity,
  CaseEntity, LlmUsageLogEntity,
  VideoMetricEntity, MonthlyReportEntity, NpsRecordEntity, ComplaintEntity,
  HealthScoreSnapshotEntity,
  RenewalRecordEntity, NegotiationNoteEntity, ChurnRecordEntity, CompanyGoalEntity,
  CustomerUserEntity, InvoiceRequestEntity,
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
  console.info('DB connected. Seeding phase-7...');

  const tenants = await ds.getRepository(TenantEntity).find();
  for (const t of tenants) await seedForTenant(ds, t.id);

  console.info('\n✓ Phase 7 种子完成');
  await ds.destroy();
}

async function seedForTenant(ds: DataSource, tenantId: string) {
  const customers = await ds.getRepository(CustomerEntity).find({
    where: { tenantId, stage: 'delivering' },
    take: 1,
  });
  if (customers.length === 0) {
    console.info(`  - tenant ${tenantId.slice(0, 8)}… 无 delivering 客户，跳过`);
    return;
  }
  const c = customers[0];

  // 1. CustomerUser（openid=dev:{bossPhone}，用于 devLogin 跑通）
  const usersRepo = ds.getRepository(CustomerUserEntity);
  let cu = await usersRepo.findOne({ where: { tenantId, customerId: c.id } });
  if (!cu) {
    cu = await usersRepo.save(
      usersRepo.create({
        tenantId,
        customerId: c.id,
        phone: c.bossPhone,
        openid: `dev:${c.bossPhone}`,
        loginCount: 0,
      }),
    );
  }

  // 2. 待审视频（若该客户还没有 pending_review）
  const videosRepo = ds.getRepository(VideoEntity);
  let pending = await videosRepo.findOne({
    where: { tenantId, customerId: c.id, status: 'pending_review' },
  });
  if (!pending) {
    const projects = await ds.getRepository(ProjectEntity).find({
      where: { tenantId, customerId: c.id },
      take: 1,
    });
    if (projects.length === 0) {
      console.info(`    - 客户 ${c.companyName} 没有项目，跳过视频种子`);
    } else {
      pending = await videosRepo.save(
        videosRepo.create({
          tenantId,
          projectId: projects[0].id,
          customerId: c.id,
          title: `【待审】${c.companyName} · 新品种草片`,
          script: '开头 3 秒 · 引发好奇\n中段 · 展示卖点\n结尾 · CTA',
          status: 'pending_review',
          draftVideoUrl: 'https://mock.mindlink.dev/videos/phase7-draft.mp4',
          coverUrl: 'https://mock.mindlink.dev/videos/phase7-cover.jpg',
          copywriting: '探店实拍｜巷子里的宝藏店，本地人都吃过 3 次以上！',
          titles: JSON.stringify(['探店实拍｜巷子里的宝藏店', '本地人都吃过 3 次以上']),
          tags: JSON.stringify(['本地生活', '探店']),
          reviewSubmittedAt: new Date(Date.now() - 2 * 3600_000),
        }),
      );
    }
  }

  // 3. 上月月报（sent · 未读）
  const reportsRepo = ds.getRepository(MonthlyReportEntity);
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  let report = await reportsRepo.findOne({
    where: { tenantId, customerId: c.id, month: prevMonth },
  });
  if (!report) {
    report = await reportsRepo.save(
      reportsRepo.create({
        tenantId,
        customerId: c.id,
        projectId: null,
        month: prevMonth,
        status: 'sent',
        aiDraft: null,
        finalContent: `# ${prevMonth} 月报 · ${c.companyName}\n\n**本月总览**：播放 12.4 万 · 到店 68 单 · ROI 2.3\n\n**下月重点**：巷子空镜片测小规模投放`,
        sections: JSON.stringify({
          overview: { plays: 124000, toStore: 68, roi: 2.3 },
          deliverables: ['成片 4 条', '已投放 1 条'],
          trafficAnalysis: '完播 38% → 目标 45%',
          topHits: [
            { title: '招牌菜 3 刀切开 ASMR', plays: 42000 },
            { title: '凌晨 2 点的后厨', plays: 31000 },
          ],
          reflections: '投流预算偏低，爆款流量没吃满',
          nextFocus: '加投 ¥3000 看回报',
        }),
        pushedAt: new Date(Date.now() - 3 * 86400_000),
      }),
    );
  }

  console.info(
    `  ✓ tenant ${tenantId.slice(0, 8)}… customer=${c.companyName} · customerUser=${cu.id.slice(0, 8)}… · pending=${pending?.id.slice(0, 8) ?? '-'} · report=${report.id.slice(0, 8)}`,
  );
}

run().catch((e) => { console.error('Seed phase-7 failed:', e); process.exit(1); });

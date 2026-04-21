/**
 * Phase 6 种子：
 *  1. 给每租户 delivering 客户的 `contractExpiresAt` 推到 15 天后，触发续约预警
 *  2. 录入本月公司目标（新签 8 · 续约 12 · 流失红线 3）
 *  3. 额外创建 1 个已流失客户 + 流失档
 *
 * 跑法：
 *   pnpm --filter @mindlink/api seed:phase-6
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
import { HealthScoreSnapshotEntity } from '@/modules/health-score/entities/health-score-snapshot.entity';
import { RenewalRecordEntity, NegotiationNoteEntity } from '@/modules/renewals/entities/renewal-record.entity';
import { ChurnRecordEntity } from '@/modules/churn/entities/churn-record.entity';
import { CompanyGoalEntity } from '@/modules/goals/entities/company-goal.entity';

const ENTITIES = [
  UserEntity, TenantEntity, StaffEntity, AuditLogEntity,
  CustomerEntity, LeadFollowUpEntity, DiagnosisReportEntity,
  PackageEntity, PositioningBookEntity, UploadEntity,
  ContractEntity, ContractTemplateEntity, PaymentEntity,
  ProjectEntity, KickoffMeetingEntity, TaskEntity, VideoEntity,
  CaseEntity, LlmUsageLogEntity,
  VideoMetricEntity, MonthlyReportEntity, NpsRecordEntity, ComplaintEntity,
  HealthScoreSnapshotEntity,
  RenewalRecordEntity, NegotiationNoteEntity, ChurnRecordEntity, CompanyGoalEntity,
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
  console.info('DB connected. Seeding phase-6...');

  const tenants = await ds.getRepository(TenantEntity).find();
  for (const t of tenants) await seedForTenant(ds, t.id);

  console.info('\n✓ Phase 6 种子完成');
  await ds.destroy();
}

async function seedForTenant(ds: DataSource, tenantId: string) {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 1. 本月公司目标
  const goalsRepo = ds.getRepository(CompanyGoalEntity);
  const existingGoal = await goalsRepo.findOne({ where: { tenantId, month } });
  if (!existingGoal) {
    await goalsRepo.save(goalsRepo.create({
      tenantId, month,
      newCustomers: 8,
      renewalCustomers: 12,
      churnRedLine: 3,
      targetRevenue: 50_000_00, // 50 万
      targetArpu: 1_800_00, // 1.8 万
    }));
  }

  // 2. 把 delivering 客户的 contractExpiresAt 设为 15 天后 → 触发预警
  const customers = await ds.getRepository(CustomerEntity).find({
    where: { tenantId, stage: 'delivering' },
  });
  if (customers.length > 0) {
    const c = customers[0];
    c.contractExpiresAt = new Date(Date.now() + 15 * 86400_000);
    await ds.getRepository(CustomerEntity).save(c);

    // 3. 直接创建一条 warning 状态的续约记录（避免依赖 scan 扫描时机）
    const contracts = await ds.getRepository(ContractEntity).find({
      where: { tenantId, customerId: c.id, status: 'signed' },
    });
    if (contracts.length > 0) {
      const renewalsRepo = ds.getRepository(RenewalRecordEntity);
      const existing = await renewalsRepo.findOne({
        where: { tenantId, customerId: c.id, originalContractId: contracts[0].id },
      });
      if (!existing) {
        await renewalsRepo.save(renewalsRepo.create({
          tenantId,
          customerId: c.id,
          originalContractId: contracts[0].id,
          stage: 'warning',
          expiresAt: c.contractExpiresAt!,
        }));
      }
    }
  }

  // 4. 创建 1 条流失案例（用另一个客户 stage=signed 的）
  const signedCustomers = await ds.getRepository(CustomerEntity).find({
    where: { tenantId, stage: 'proposing' },
    take: 1,
  });
  if (signedCustomers.length > 0) {
    const c = signedCustomers[0];
    const existing = await ds.getRepository(ChurnRecordEntity).findOne({
      where: { tenantId, customerId: c.id },
    });
    if (!existing) {
      await ds.getRepository(ChurnRecordEntity).save({
        tenantId,
        customerId: c.id,
        renewalId: null,
        reason: 'effect',
        interviewNotes: '客户反馈 3 个月未见到预期的到店增长',
        improvementSuggestion: '提前约定 KPI + 增加月中复盘',
        churnedAt: new Date(Date.now() - 15 * 86400_000),
      });
      c.stage = 'churned';
      c.churnedAt = new Date(Date.now() - 15 * 86400_000);
      await ds.getRepository(CustomerEntity).save(c);
    }
  }

  console.info(`  ✓ tenant ${tenantId.slice(0, 8)}… 本月目标 + 续约预警 + 1 流失案例`);
}

run().catch((e) => { console.error('Seed phase-6 failed:', e); process.exit(1); });

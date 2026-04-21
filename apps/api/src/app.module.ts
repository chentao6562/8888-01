import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { StaffModule } from './modules/staff/staff.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { LlmModule } from './modules/llm/llm.module';
import { EsignModule } from './modules/esign/esign.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { CustomersModule } from './modules/customers/customers.module';
import { LeadsModule } from './modules/leads/leads.module';
import { DiagnosisModule } from './modules/diagnosis/diagnosis.module';
import { ProposalsModule } from './modules/proposals/proposals.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { VideosModule } from './modules/videos/videos.module';
import { AiContentModule } from './modules/ai-content/ai-content.module';
import { CasesModule } from './modules/cases/cases.module';
import { TeleprompterModule } from './modules/teleprompter/teleprompter.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { NpsModule } from './modules/nps/nps.module';
import { HealthScoreModule } from './modules/health-score/health-score.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RenewalsModule } from './modules/renewals/renewals.module';
import { ChurnModule } from './modules/churn/churn.module';
import { GoalsModule } from './modules/goals/goals.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { WechatModule } from './modules/wechat/wechat.module';
import { ClientModule } from './modules/client/client.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { EncryptionModule } from './common/encryption/encryption.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env', '../../.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('db')!,
    }),
    EncryptionModule,
    AuditModule,
    LlmModule,
    EsignModule,
    UsersModule,
    TenantsModule,
    StaffModule,
    AuthModule,
    UploadsModule,
    CustomersModule,
    LeadsModule,
    DiagnosisModule,
    ProposalsModule,
    ContractsModule,
    TasksModule,
    ProjectsModule,
    VideosModule,
    AiContentModule,
    CasesModule,
    TeleprompterModule,
    MetricsModule,
    ComplaintsModule,
    NpsModule,
    HealthScoreModule,
    ReportsModule,
    AnalyticsModule,
    RenewalsModule,
    ChurnModule,
    GoalsModule,
    DashboardModule,
    WechatModule,
    ClientModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}

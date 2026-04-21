import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmService } from './llm.service';
import { MockLlmProvider } from './providers/mock.provider';
import { OpenAiCompatProvider } from './providers/openai-compat.provider';
import { QuotaService } from './quota.service';
import { SensitiveService } from './sensitive.service';
import { LlmUsageLogEntity } from './entities/llm-usage-log.entity';
import { TenantEntity } from '@/modules/tenants/entities/tenant.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([LlmUsageLogEntity, TenantEntity])],
  providers: [
    LlmService,
    MockLlmProvider,
    OpenAiCompatProvider,
    QuotaService,
    SensitiveService,
  ],
  exports: [LlmService, SensitiveService, QuotaService],
})
export class LlmModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoEntity } from '@/modules/videos/entities/video.entity';
import { CustomerEntity } from '@/modules/customers/entities/customer.entity';
import { ContractEntity } from '@/modules/contracts/entities/contract.entity';
import { PaymentEntity } from '@/modules/contracts/entities/payment.entity';
import { TaskEntity } from '@/modules/tasks/entities/task.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { MetricsModule } from '@/modules/metrics/metrics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VideoEntity, CustomerEntity, ContractEntity, PaymentEntity, TaskEntity,
    ]),
    MetricsModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

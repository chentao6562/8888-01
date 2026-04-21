import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonthlyReportEntity } from './entities/monthly-report.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { MetricsModule } from '@/modules/metrics/metrics.module';
import { CustomersModule } from '@/modules/customers/customers.module';
import { NpsModule } from '@/modules/nps/nps.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MonthlyReportEntity]),
    MetricsModule,
    CustomersModule,
    NpsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

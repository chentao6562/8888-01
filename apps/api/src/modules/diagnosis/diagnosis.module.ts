import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiagnosisReportEntity } from './entities/diagnosis-report.entity';
import { DiagnosisService } from './diagnosis.service';
import { DiagnosisController } from './diagnosis.controller';
import { CustomersModule } from '@/modules/customers/customers.module';

@Module({
  imports: [TypeOrmModule.forFeature([DiagnosisReportEntity]), CustomersModule],
  controllers: [DiagnosisController],
  providers: [DiagnosisService],
  exports: [DiagnosisService],
})
export class DiagnosisModule {}

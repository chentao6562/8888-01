import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerEntity } from '@/modules/customers/entities/customer.entity';
import { StaffEntity } from '@/modules/staff/entities/staff.entity';
import { TaskEntity } from '@/modules/tasks/entities/task.entity';
import { ContractEntity } from '@/modules/contracts/entities/contract.entity';
import { PaymentEntity } from '@/modules/contracts/entities/payment.entity';
import { RenewalRecordEntity } from '@/modules/renewals/entities/renewal-record.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { GoalsModule } from '@/modules/goals/goals.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerEntity, StaffEntity, TaskEntity,
      ContractEntity, PaymentEntity, RenewalRecordEntity,
    ]),
    GoalsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

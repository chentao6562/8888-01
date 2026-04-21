import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChurnRecordEntity } from './entities/churn-record.entity';
import { ChurnService } from './churn.service';
import { ChurnController } from './churn.controller';
import { CustomersModule } from '@/modules/customers/customers.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChurnRecordEntity]), CustomersModule],
  controllers: [ChurnController],
  providers: [ChurnService],
  exports: [ChurnService],
})
export class ChurnModule {}

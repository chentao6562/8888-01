import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackageEntity } from './entities/package.entity';
import { PositioningBookEntity } from './entities/positioning-book.entity';
import { ProposalsService } from './proposals.service';
import { ProposalsController } from './proposals.controller';
import { CustomersModule } from '@/modules/customers/customers.module';
import { DiagnosisModule } from '@/modules/diagnosis/diagnosis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PackageEntity, PositioningBookEntity]),
    CustomersModule,
    DiagnosisModule,
  ],
  controllers: [ProposalsController],
  providers: [ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}

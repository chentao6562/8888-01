import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RenewalRecordEntity, NegotiationNoteEntity } from './entities/renewal-record.entity';
import { ContractEntity } from '@/modules/contracts/entities/contract.entity';
import { CustomerEntity } from '@/modules/customers/entities/customer.entity';
import { RenewalsService } from './renewals.service';
import { RenewalsController } from './renewals.controller';
import { CustomersModule } from '@/modules/customers/customers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RenewalRecordEntity, NegotiationNoteEntity, ContractEntity, CustomerEntity,
    ]),
    CustomersModule,
  ],
  controllers: [RenewalsController],
  providers: [RenewalsService],
  exports: [RenewalsService],
})
export class RenewalsModule {}

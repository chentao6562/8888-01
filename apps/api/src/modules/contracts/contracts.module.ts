import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractEntity } from './entities/contract.entity';
import { ContractTemplateEntity } from './entities/contract-template.entity';
import { PaymentEntity } from './entities/payment.entity';
import { PositioningBookEntity } from '@/modules/proposals/entities/positioning-book.entity';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { CustomersModule } from '@/modules/customers/customers.module';
import { TenantsModule } from '@/modules/tenants/tenants.module';
import { EsignModule } from '@/modules/esign/esign.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContractEntity,
      ContractTemplateEntity,
      PaymentEntity,
      PositioningBookEntity,
    ]),
    CustomersModule,
    TenantsModule,
    EsignModule,
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}

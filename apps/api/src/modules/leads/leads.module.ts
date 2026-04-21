import { Module } from '@nestjs/common';
import { CustomersModule } from '@/modules/customers/customers.module';
import { LeadsController } from './leads.controller';

@Module({
  imports: [CustomersModule],
  controllers: [LeadsController],
})
export class LeadsModule {}

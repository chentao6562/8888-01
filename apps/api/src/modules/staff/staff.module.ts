import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffEntity } from './entities/staff.entity';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { TenantsModule } from '@/modules/tenants/tenants.module';

@Module({
  imports: [TypeOrmModule.forFeature([StaffEntity]), TenantsModule],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}

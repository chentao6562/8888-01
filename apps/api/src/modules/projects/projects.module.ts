import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectEntity } from './entities/project.entity';
import { KickoffMeetingEntity } from './entities/kickoff-meeting.entity';
import { ContractEntity } from '@/modules/contracts/entities/contract.entity';
import { StaffEntity } from '@/modules/staff/entities/staff.entity';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { CustomersModule } from '@/modules/customers/customers.module';
import { TasksModule } from '@/modules/tasks/tasks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectEntity, KickoffMeetingEntity, ContractEntity, StaffEntity]),
    CustomersModule,
    TasksModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}

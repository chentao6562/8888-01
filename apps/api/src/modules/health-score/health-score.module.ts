import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthScoreSnapshotEntity } from './entities/health-score-snapshot.entity';
import { TaskEntity } from '@/modules/tasks/entities/task.entity';
import { VideoEntity } from '@/modules/videos/entities/video.entity';
import { HealthScoreService } from './health-score.service';
import { HealthScoreController } from './health-score.controller';
import { MetricsModule } from '@/modules/metrics/metrics.module';
import { NpsModule } from '@/modules/nps/nps.module';
import { ComplaintsModule } from '@/modules/complaints/complaints.module';
import { CustomersModule } from '@/modules/customers/customers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HealthScoreSnapshotEntity, TaskEntity, VideoEntity]),
    MetricsModule,
    NpsModule,
    ComplaintsModule,
    CustomersModule,
  ],
  controllers: [HealthScoreController],
  providers: [HealthScoreService],
  exports: [HealthScoreService],
})
export class HealthScoreModule {}

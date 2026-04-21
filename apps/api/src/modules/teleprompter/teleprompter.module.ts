import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoEntity } from '@/modules/videos/entities/video.entity';
import { TeleprompterService } from './teleprompter.service';
import { TeleprompterController } from './teleprompter.controller';
import { VideosModule } from '@/modules/videos/videos.module';

@Module({
  imports: [TypeOrmModule.forFeature([VideoEntity]), VideosModule],
  controllers: [TeleprompterController],
  providers: [TeleprompterService],
  exports: [TeleprompterService],
})
export class TeleprompterModule {}

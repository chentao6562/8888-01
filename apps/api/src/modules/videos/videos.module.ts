import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoEntity } from './entities/video.entity';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VideoEntity])],
  controllers: [VideosController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}

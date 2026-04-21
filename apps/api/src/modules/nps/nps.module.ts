import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NpsRecordEntity } from './entities/nps-record.entity';
import { NpsService } from './nps.service';
import { NpsController } from './nps.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NpsRecordEntity])],
  controllers: [NpsController],
  providers: [NpsService],
  exports: [NpsService],
})
export class NpsModule {}

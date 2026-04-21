import { Module } from '@nestjs/common';
import { AiContentService } from './ai-content.service';
import { AiContentController } from './ai-content.controller';

@Module({
  controllers: [AiContentController],
  providers: [AiContentService],
  exports: [AiContentService],
})
export class AiContentModule {}

import { Global, Module } from '@nestjs/common';
import { EsignService } from './esign.service';

@Global()
@Module({
  providers: [EsignService],
  exports: [EsignService],
})
export class EsignModule {}

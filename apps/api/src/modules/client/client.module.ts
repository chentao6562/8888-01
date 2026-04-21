import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { CustomerUserEntity } from '@/modules/client-users/entities/customer-user.entity';
import { CustomerEntity } from '@/modules/customers/entities/customer.entity';
import { VideoEntity } from '@/modules/videos/entities/video.entity';
import { VideoCommentEntity } from '@/modules/videos/entities/video-comment.entity';
import { MonthlyReportEntity } from '@/modules/reports/entities/monthly-report.entity';
import { ContractEntity } from '@/modules/contracts/entities/contract.entity';
import { PaymentEntity } from '@/modules/contracts/entities/payment.entity';
import { RenewalRecordEntity } from '@/modules/renewals/entities/renewal-record.entity';
import { InvoiceRequestEntity } from '@/modules/client-users/entities/invoice-request.entity';
import { NpsModule } from '@/modules/nps/nps.module';
import { ComplaintsModule } from '@/modules/complaints/complaints.module';
import { WechatModule } from '@/modules/wechat/wechat.module';
import { MetricsModule } from '@/modules/metrics/metrics.module';
import { VideosModule } from '@/modules/videos/videos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerUserEntity, CustomerEntity,
      VideoEntity, VideoCommentEntity,
      MonthlyReportEntity, ContractEntity, PaymentEntity,
      RenewalRecordEntity, InvoiceRequestEntity,
    ]),
    NpsModule, ComplaintsModule, WechatModule, MetricsModule, VideosModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: (config.get<string>('jwt.expiresIn') ?? '1h') as unknown as number },
      }),
    }),
  ],
  controllers: [ClientController],
  providers: [ClientService],
})
export class ClientModule {}

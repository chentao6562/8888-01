import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClientService } from './client.service';
import {
  WechatLoginDto, BindPhoneDto, DevLoginDto,
  AddVideoCommentDto, ReviewVideoDto,
  ClientNpsDto, ClientComplaintDto,
  UploadVoucherDto, InvoiceRequestDto,
} from './dto/client.dto';
import { Public } from '@/common/decorators/public.decorator';
import { CustomerAuthGuard } from '@/common/guards/customer-auth.guard';
import { RateLimit } from '@/common/guards/rate-limit.guard';

interface ClientRequest extends Request {
  tenantId: string;
  customerId: string;
  customerUserId: string;
}

@ApiTags('client')
@Controller('client')
export class ClientController {
  constructor(private readonly svc: ClientService) {}

  // ===== auth =====

  @Public()
  @Post('auth/wechat-login')
  @HttpCode(200)
  @RateLimit({ windowSec: 60, max: 20 })
  @ApiOperation({ summary: '微信登录（code 换 openid · 未绑定返回 tempToken）' })
  wechatLogin(@Body() body: WechatLoginDto) {
    return this.svc.wechatLogin(body.code);
  }

  @Public()
  @Post('auth/bind-phone')
  @HttpCode(200)
  @RateLimit({ windowSec: 60, max: 10 })
  @ApiOperation({ summary: '绑定手机号（MVP 简化：匹配 customer.bossPhone 即绑定）' })
  bindPhone(@Body() body: BindPhoneDto) {
    return this.svc.bindPhone(body.tempToken, body.phone, body.verifyCode);
  }

  @Public()
  @Post('auth/dev-login')
  @HttpCode(200)
  @RateLimit({ windowSec: 60, max: 10 })
  @ApiOperation({ summary: '开发用直连登录（生产环境硬禁用 · 无 escape hatch）' })
  devLogin(@Body() body: DevLoginDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException({
        code: 'DEV_LOGIN_DISABLED',
        message: '生产环境禁用开发登录入口',
      });
    }
    return this.svc.devLogin(body.phone);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: '当前客户信息' })
  me(@Req() req: ClientRequest) {
    return this.svc.me(req.customerUserId);
  }

  // ===== dashboard =====

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Get('dashboard')
  @ApiOperation({ summary: '客户端首屏聚合（3 大数字 + 待办 + 本周视频 + 月报入口）' })
  dashboard(@Req() req: ClientRequest) {
    return this.svc.dashboard(req.tenantId, req.customerId);
  }

  // ===== videos =====

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Get('videos/pending-review')
  @ApiOperation({ summary: '待审视频列表' })
  pendingReviews(@Req() req: ClientRequest) {
    return this.svc.pendingReviews(req.tenantId, req.customerId);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Get('videos/:id')
  @ApiOperation({ summary: '视频详情（含打点批注）' })
  videoDetail(@Req() req: ClientRequest, @Param('id') id: string) {
    return this.svc.videoDetail(req.tenantId, req.customerId, id);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post('videos/:id/comments')
  @ApiOperation({ summary: '打点批注' })
  addComment(
    @Req() req: ClientRequest,
    @Param('id') id: string,
    @Body() body: AddVideoCommentDto,
  ) {
    return this.svc.addVideoComment(
      req.tenantId, req.customerId, req.customerUserId, id, body,
    );
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post('videos/:id/review')
  @HttpCode(200)
  @ApiOperation({ summary: '提交审核结果 approve / minor_change / reshoot' })
  review(
    @Req() req: ClientRequest,
    @Param('id') id: string,
    @Body() body: ReviewVideoDto,
  ) {
    return this.svc.reviewVideo(req.tenantId, req.customerId, id, body.action);
  }

  // ===== reports =====

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Get('reports')
  @ApiOperation({ summary: '月报列表（已推送/已读）' })
  reports(@Req() req: ClientRequest) {
    return this.svc.listReports(req.tenantId, req.customerId);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Get('reports/:id')
  @ApiOperation({ summary: '月报详情' })
  reportDetail(@Req() req: ClientRequest, @Param('id') id: string) {
    return this.svc.reportDetail(req.tenantId, req.customerId, id);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post('reports/:id/read')
  @HttpCode(200)
  @ApiOperation({ summary: '标已读（阅读完 → 触发 NPS 弹窗）' })
  markRead(@Req() req: ClientRequest, @Param('id') id: string) {
    return this.svc.markReportRead(req.tenantId, req.customerId, id);
  }

  // ===== NPS + Complaints =====

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post('nps')
  @ApiOperation({ summary: '提交 NPS' })
  nps(@Req() req: ClientRequest, @Body() body: ClientNpsDto) {
    return this.svc.submitNps(req.tenantId, req.customerId, req.customerUserId, body);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post('complaints')
  @ApiOperation({ summary: '客户提投诉' })
  complaint(@Req() req: ClientRequest, @Body() body: ClientComplaintDto) {
    return this.svc.fileComplaint(req.tenantId, req.customerId, body);
  }

  // ===== contracts / invoices =====

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Get('contracts')
  @ApiOperation({ summary: '合同列表 + 分笔付款' })
  contracts(@Req() req: ClientRequest) {
    return this.svc.listContracts(req.tenantId, req.customerId);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post('contracts/:id/payments/:paymentId/voucher')
  @HttpCode(200)
  @ApiOperation({ summary: '客户上传付款凭证 URL' })
  uploadVoucher(
    @Req() req: ClientRequest,
    @Param('id') contractId: string,
    @Param('paymentId') paymentId: string,
    @Body() body: UploadVoucherDto,
  ) {
    return this.svc.uploadVoucher(req.tenantId, req.customerId, contractId, paymentId, body.voucherUrl);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post('invoice-requests')
  @ApiOperation({ summary: '发票申请' })
  invoice(
    @Req() req: ClientRequest,
    @Body() body: InvoiceRequestDto,
  ) {
    return this.svc.requestInvoice(req.tenantId, req.customerId, body);
  }

  // ===== renewals =====

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Get('renewals/current')
  @ApiOperation({ summary: '当前续约卡（到期前 30 天才有）' })
  currentRenewal(@Req() req: ClientRequest) {
    return this.svc.currentRenewal(req.tenantId, req.customerId);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post('renewals/:id/book-consult')
  @HttpCode(200)
  @ApiOperation({ summary: '预约续约沟通（会通知 PM）' })
  bookConsult(@Req() req: ClientRequest, @Param('id') id: string) {
    return this.svc.bookRenewalConsult(req.tenantId, req.customerId, id);
  }
}

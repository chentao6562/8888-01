import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import type { RequestUser } from '@/common/types/request-user';
import type { ContractStatus } from './entities/contract.entity';
import { Audit } from '@/common/interceptors/audit.interceptor';

@ApiTags('contracts')
@ApiBearerAuth()
@Controller()
export class ContractsController {
  constructor(private readonly svc: ContractsService) {}

  // === 模板 ===
  @Get('contract-templates')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '合同模板列表（官方 + 租户私库）' })
  listTemplates(@CurrentTenant() tenantId: string) {
    return this.svc.listTemplates(tenantId);
  }

  @Post('contract-templates')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '新建租户私有合同模板' })
  createTemplate(
    @CurrentTenant() tenantId: string,
    @Body() body: { tier: string; name: string; body: string },
  ) {
    return this.svc.createTemplate(tenantId, body);
  }

  // === 合同 ===
  @Get('contracts')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '合同列表（支持 status 过滤）' })
  list(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: ContractStatus,
  ) {
    return this.svc.list(tenantId, status);
  }

  @Get('contracts/:id')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '合同详情' })
  get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.findById(tenantId, id);
  }

  @Get('contracts/:id/payments')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '合同的 4 笔付款列表' })
  payments(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.listPayments(tenantId, id);
  }

  @Post('contracts')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '基于方案创建合同（自动拆 4 笔付款）' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateContractDto,
  ) {
    return this.svc.create(tenantId, user.staffId, dto);
  }

  @Patch('contracts/:id')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '编辑合同（仅 draft 可改）' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { bodySnapshot?: string; totalAmount?: number },
  ) {
    return this.svc.update(tenantId, id, body);
  }

  @Post('contracts/:id/send-for-signing')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('admin', 'pm')
  @HttpCode(200)
  @Audit('contract.send_for_signing')
  @ApiOperation({ summary: '发起电子签（mock 返回 signUrl）' })
  send(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.sendForSigning(tenantId, id);
  }

  /**
   * 电子签回调。Mock provider 下对外公开（方便本地手工触发）；
   * 真实 provider 必须带 `X-Esign-Signature` 头（HMAC-SHA256 of raw body with ESIGN_CALLBACK_SECRET）。
   */
  @Public()
  @Post('contracts/:id/esign-callback')
  @HttpCode(200)
  @Audit('contract.esign_callback')
  @ApiOperation({ summary: '电子签回调（mock 公开；真实 provider 需签名校验）' })
  callback(
    @Param('id') id: string,
    @Headers('x-esign-signature') signature: string | undefined,
    @Body() body: { tenantId: string; orderId: string; signed: boolean },
  ) {
    const provider = process.env.ESIGN_PROVIDER ?? 'mock';
    if (provider !== 'mock') {
      const secret = process.env.ESIGN_CALLBACK_SECRET;
      if (!secret) {
        throw new UnauthorizedException({
          code: 'ESIGN_SECRET_MISSING',
          message: 'ESIGN_CALLBACK_SECRET 未配置，拒绝回调',
        });
      }
      if (!signature) {
        throw new UnauthorizedException({
          code: 'ESIGN_SIGNATURE_MISSING',
          message: '缺少 X-Esign-Signature 头',
        });
      }
      const expected = createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');
      const got = signature.toLowerCase().trim();
      const ok =
        expected.length === got.length &&
        timingSafeEqual(Buffer.from(expected), Buffer.from(got));
      if (!ok) {
        throw new UnauthorizedException({
          code: 'ESIGN_SIGNATURE_INVALID',
          message: '回调签名校验失败',
        });
      }
    }
    return this.svc.handleCallback(body.tenantId, body.orderId, body.signed);
  }

  @Post('contracts/:id/state')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('admin', 'pm')
  @HttpCode(200)
  @ApiOperation({ summary: '状态机跳转（draft→pending_sign / signed→executing 等）' })
  transition(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { to: ContractStatus },
  ) {
    return this.svc.transition(tenantId, id, body.to);
  }

  // === Payments ===
  @Post('contracts/:id/payments/:paymentId/register')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('admin', 'pm')
  @HttpCode(200)
  @Audit('payment.register')
  @ApiOperation({ summary: '登记付款（幂等键防重复）' })
  registerPayment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: RegisterPaymentDto,
  ) {
    return this.svc.registerPayment(tenantId, id, paymentId, user.staffId, dto);
  }

  @Post('contracts/:id/payments/:paymentId/voucher')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('admin', 'pm')
  @HttpCode(200)
  @ApiOperation({ summary: '上传付款凭证 URL' })
  voucher(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Body() body: { voucherUrl: string },
  ) {
    return this.svc.uploadVoucher(tenantId, id, paymentId, body.voucherUrl);
  }
}

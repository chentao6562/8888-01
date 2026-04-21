import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProposalsService } from './proposals.service';
import {
  CalculateQuoteDto,
  CreateProposalDto,
  UpdateProposalDto,
} from './dto/create-proposal.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';

@ApiTags('proposals')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller()
export class ProposalsController {
  constructor(private readonly svc: ProposalsService) {}

  // 套餐库（全体可读）
  @Get('packages')
  @Roles('admin', 'pm', 'strategist', 'creator', 'adops')
  @ApiOperation({ summary: '套餐库（官方 + 租户私库合并）' })
  listPackages(@CurrentTenant() tenantId: string) {
    return this.svc.listPackages(tenantId);
  }

  @Get('customers/:customerId/package-recommendation')
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '基于客户画像推荐套餐' })
  recommend(
    @CurrentTenant() tenantId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.svc.recommendPackage(tenantId, customerId);
  }

  // 方案
  @Post('customers/:customerId/proposals')
  @Roles('admin', 'pm', 'strategist')
  @HttpCode(201)
  @ApiOperation({ summary: '基于诊断创建方案（版本 +1，AI 生成初稿）' })
  create(
    @CurrentTenant() tenantId: string,
    @Param('customerId') customerId: string,
    @Body() dto: CreateProposalDto,
  ) {
    return this.svc.create(tenantId, customerId, dto);
  }

  @Get('customers/:customerId/proposals')
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '客户的方案列表（按版本降序）' })
  list(
    @CurrentTenant() tenantId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.svc.list(tenantId, customerId);
  }

  @Post('proposals/calculate-quote')
  @Roles('admin', 'pm', 'strategist')
  @HttpCode(200)
  @ApiOperation({ summary: '报价计算器（不落库）' })
  calculate(@CurrentTenant() tenantId: string, @Body() dto: CalculateQuoteDto) {
    return this.svc.calculateQuote(tenantId, dto);
  }

  @Get('proposals/:id')
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '方案详情' })
  get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.findById(tenantId, id);
  }

  @Patch('proposals/:id')
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '编辑方案（签字后不可改）' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProposalDto,
  ) {
    return this.svc.update(tenantId, id, dto);
  }

  @Post('proposals/:id/finalize')
  @Roles('admin', 'pm', 'strategist')
  @HttpCode(200)
  @ApiOperation({ summary: '定稿（draft → final）' })
  finalize(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.finalize(tenantId, id);
  }

  @Post('proposals/:id/sign')
  @Roles('admin', 'pm')
  @HttpCode(200)
  @ApiOperation({ summary: '标记已签字 → 客户 stage = signed（合同流由 phase 3 承接）' })
  sign(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.sign(tenantId, id);
  }
}

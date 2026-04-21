import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RenewalsService } from './renewals.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import type { RequestUser } from '@/common/types/request-user';
import type { RenewalStage } from './entities/renewal-record.entity';

@ApiTags('renewals')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('renewals')
export class RenewalsController {
  constructor(private readonly svc: RenewalsService) {}

  @Get('board')
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '续约预警看板（warning + negotiating）' })
  board(@CurrentTenant() tenantId: string) {
    return this.svc.board(tenantId);
  }

  @Get()
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '续约记录列表' })
  list(
    @CurrentTenant() tenantId: string,
    @Query('stage') stage?: RenewalStage,
  ) {
    return this.svc.list(tenantId, stage);
  }

  @Post('scan')
  @Roles('admin', 'pm')
  @HttpCode(200)
  @ApiOperation({ summary: '手动触发到期扫描（phase 8 改定时任务）' })
  scan(@CurrentTenant() tenantId: string) {
    return this.svc.scanWarnings(tenantId);
  }

  @Get(':id')
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '续约详情' })
  get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.findById(tenantId, id);
  }

  @Post(':id/generate-proposal')
  @Roles('admin', 'pm')
  @HttpCode(200)
  @ApiOperation({ summary: 'AI 生成续约提案（进入 negotiating）' })
  generate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.svc.generateProposal(tenantId, user.staffId, id);
  }

  @Post(':id/notes')
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '记录谈判' })
  addNote(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { channel?: 'phone' | 'wechat' | 'visit' | 'other'; notes: string },
  ) {
    return this.svc.addNote(tenantId, user.staffId, id, body);
  }

  @Get(':id/notes')
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '谈判记录列表' })
  listNotes(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.listNotes(tenantId, id);
  }

  @Post(':id/won')
  @Roles('admin', 'pm')
  @HttpCode(200)
  @ApiOperation({ summary: '续约成功' })
  won(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.markWon(tenantId, id);
  }

  @Post(':id/lost')
  @Roles('admin', 'pm')
  @HttpCode(200)
  @ApiOperation({ summary: '续约失败（进入流失）' })
  lost(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { reason: 'product' | 'price' | 'effect' | 'closure' | 'other'; analysis?: string },
  ) {
    return this.svc.markLost(tenantId, id, body.reason, body.analysis);
  }
}

import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NpsService } from './nps.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import type { RequestUser } from '@/common/types/request-user';

@ApiTags('nps')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('nps')
export class NpsController {
  constructor(private readonly svc: NpsService) {}

  @Get()
  @Roles('admin', 'pm')
  @ApiOperation({ summary: 'NPS 列表' })
  list(@CurrentTenant() tenantId: string, @Query('customerId') customerId?: string) {
    return this.svc.list(tenantId, customerId);
  }

  /** 管理端专用：让 PM 代客户录入 NPS（phase 7 前用）。客户端 submit 在 /client/nps */
  @Post()
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '管理端代录 NPS（phase 7 客户端接通后可弃用）' })
  submit(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      customerId: string;
      reportId?: string;
      score: number;
      comment?: string;
    },
  ) {
    return this.svc.submit(tenantId, { ...body, submittedBy: user.staffId });
  }
}

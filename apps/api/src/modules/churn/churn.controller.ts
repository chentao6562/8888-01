import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChurnService } from './churn.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import type { RequestUser } from '@/common/types/request-user';
import type { ChurnReason } from './entities/churn-record.entity';

@ApiTags('churn')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('churn')
export class ChurnController {
  constructor(private readonly svc: ChurnService) {}

  @Get()
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '流失列表' })
  list(@CurrentTenant() tenantId: string, @Query('reason') reason?: ChurnReason) {
    return this.svc.list(tenantId, reason);
  }

  @Get('analytics')
  @Roles('admin')
  @ApiOperation({ summary: '月度流失分析' })
  analytics(@CurrentTenant() tenantId: string, @Query('month') month?: string) {
    const m = month ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    return this.svc.monthlyAnalysis(tenantId, m);
  }

  @Post()
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '标记客户流失（可脱离续约独立使用）' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      customerId: string;
      renewalId?: string;
      reason: ChurnReason;
      interviewNotes?: string;
      improvementSuggestion?: string;
    },
  ) {
    return this.svc.create(tenantId, user.staffId, body);
  }

  @Patch(':id/interview')
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '补充流失访谈' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { interviewNotes?: string; improvementSuggestion?: string },
  ) {
    return this.svc.updateInterview(tenantId, id, body);
  }
}

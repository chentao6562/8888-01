import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';

@ApiTags('goals')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly svc: GoalsService) {}

  @Get()
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '本月目标' })
  current(@CurrentTenant() tenantId: string) {
    return this.svc.current(tenantId);
  }

  @Get('history')
  @Roles('admin')
  @ApiOperation({ summary: '历史目标（近 12 月）' })
  history(@CurrentTenant() tenantId: string) {
    return this.svc.history(tenantId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: '录入 / 更新本月目标' })
  upsert(
    @CurrentTenant() tenantId: string,
    @Body()
    body: {
      month?: string;
      newCustomers: number;
      renewalCustomers: number;
      churnRedLine: number;
      targetRevenue: number;
      targetArpu: number;
    },
  ) {
    return this.svc.upsert(tenantId, body);
  }
}

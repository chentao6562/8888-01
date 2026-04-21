import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: '一次拉取所有模块（推荐）' })
  all(@CurrentTenant() tenantId: string) {
    return this.svc.dashboard(tenantId);
  }

  @Get('customer-lights')
  @Roles('admin')
  @ApiOperation({ summary: '客户红绿灯' })
  lights(@CurrentTenant() tenantId: string) {
    return this.svc.customerLights(tenantId);
  }

  @Get('team-capacity')
  @Roles('admin')
  @ApiOperation({ summary: '团队产能' })
  capacity(@CurrentTenant() tenantId: string) {
    return this.svc.teamCapacity(tenantId);
  }

  @Get('monthly-kpi')
  @Roles('admin')
  @ApiOperation({ summary: '本月业务指标' })
  kpi(@CurrentTenant() tenantId: string) {
    return this.svc.monthlyKpi(tenantId);
  }

  @Get('cashflow')
  @Roles('admin')
  @ApiOperation({ summary: '本月现金流' })
  cashflow(@CurrentTenant() tenantId: string) {
    return this.svc.cashflow(tenantId);
  }

  @Get('daily-decisions')
  @Roles('admin')
  @ApiOperation({ summary: '今日 3 件决策' })
  decisions(@CurrentTenant() tenantId: string) {
    return this.svc.dailyDecisions(tenantId);
  }
}

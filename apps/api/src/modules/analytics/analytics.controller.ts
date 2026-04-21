import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  @Get('projects/:id')
  @Roles('admin', 'pm', 'strategist', 'adops')
  @ApiOperation({ summary: '项目层分析' })
  project(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.project(tenantId, id);
  }

  @Get('customers/:id')
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '客户层分析（近 6 月趋势）' })
  customer(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.customer(tenantId, id);
  }

  @Get('company')
  @Roles('admin')
  @ApiOperation({ summary: '公司层分析（仅 admin）' })
  company(@CurrentTenant() tenantId: string) {
    return this.svc.company(tenantId);
  }
}

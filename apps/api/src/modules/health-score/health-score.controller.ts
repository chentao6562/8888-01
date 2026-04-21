import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthScoreService } from './health-score.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';

@ApiTags('health-score')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('customers/:customerId/health-score')
export class HealthScoreController {
  constructor(private readonly svc: HealthScoreService) {}

  @Get()
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '当前客户健康度（本月快照）' })
  current(@CurrentTenant() tenantId: string, @Param('customerId') customerId: string) {
    return this.svc.currentOrRecalc(tenantId, customerId);
  }

  @Get('history')
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '历史快照（近 12 月）' })
  history(@CurrentTenant() tenantId: string, @Param('customerId') customerId: string) {
    return this.svc.history(tenantId, customerId);
  }

  @Post('recalculate')
  @Roles('admin')
  @HttpCode(200)
  @ApiOperation({ summary: '手动重算指定月份的健康度' })
  recalc(
    @CurrentTenant() tenantId: string,
    @Param('customerId') customerId: string,
    @Body() body: { month?: string },
  ) {
    const month = body.month ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    return this.svc.calculate(tenantId, customerId, month);
  }
}

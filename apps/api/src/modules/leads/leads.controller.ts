import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomersService } from '@/modules/customers/customers.service';
import { AuditService } from '@/modules/audit/audit.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import type { RequestUser } from '@/common/types/request-user';

/**
 * 线索专属入口。线索本质是 `customers` 表中 stage=lead 的子集，
 * 本模块仅提供针对 S1 阶段的动作端点：convert（→ diagnosing）、archive、assign 等。
 */
@ApiTags('leads')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly customers: CustomersService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '线索列表（等价于 /customers?stage=lead）' })
  list(@CurrentTenant() tenantId: string) {
    return this.customers.list(tenantId, { stage: 'lead', page: 1, pageSize: 100 });
  }

  @Post(':id/convert')
  @Roles('admin', 'pm', 'strategist')
  @HttpCode(200)
  @ApiOperation({ summary: '转诊断 → stage=diagnosing' })
  async convert(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const customer = await this.customers.transitionStage(tenantId, id, 'diagnosing');
    await this.audit.log({
      tenantId,
      staffId: user.staffId,
      action: 'lead.converted',
      detail: `customer=${id}`,
    });
    return customer;
  }

  @Post(':id/archive')
  @Roles('admin', 'pm', 'strategist')
  @HttpCode(200)
  @ApiOperation({ summary: '淘汰归档' })
  async archive(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const customer = await this.customers.archive(tenantId, id);
    await this.audit.log({
      tenantId,
      staffId: user.staffId,
      action: 'lead.archived',
      detail: `customer=${id}`,
    });
    return customer;
  }

  @Post(':id/assign')
  @Roles('admin', 'pm')
  @HttpCode(200)
  @ApiOperation({ summary: '指派 PM / 策划' })
  assign(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { pmId?: string; strategistId?: string },
  ) {
    return this.customers.update(tenantId, id, {
      pmId: body.pmId ?? null,
      strategistId: body.strategistId ?? null,
    });
  }
}

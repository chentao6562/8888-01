import { Body, Controller, Get, NotFoundException, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get('current')
  @ApiOperation({ summary: '当前租户信息' })
  async current(@CurrentTenant() tenantId: string) {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) throw new NotFoundException({ code: 'TENANT_NOT_FOUND', message: '租户不存在' });
    return tenant;
  }

  @Patch('current')
  @Roles('admin')
  @ApiOperation({ summary: '更新当前租户基础信息（仅 admin）' })
  async update(@CurrentTenant() tenantId: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(tenantId, dto);
  }
}

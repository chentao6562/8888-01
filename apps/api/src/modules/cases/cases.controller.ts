import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CasesService } from './cases.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import type { RequestUser } from '@/common/types/request-user';
import type { CaseCategory } from './entities/case.entity';

@ApiTags('cases')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('cases')
export class CasesController {
  constructor(private readonly svc: CasesService) {}

  @Get()
  @Roles('admin', 'pm', 'strategist', 'creator', 'adops')
  @ApiOperation({ summary: '案例列表（私库 + 官方库合并）' })
  list(
    @CurrentTenant() tenantId: string,
    @Query('category') category?: CaseCategory,
    @Query('search') search?: string,
  ) {
    return this.svc.list(tenantId, { category, search });
  }

  @Get(':id')
  @Roles('admin', 'pm', 'strategist', 'creator', 'adops')
  @ApiOperation({ summary: '案例详情（callCount++）' })
  detail(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.findByIdAndTouch(tenantId, id);
  }

  @Post()
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '手动入库（租户私库）' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      category: CaseCategory;
      title: string;
      content: string;
      industry?: string;
      tags?: string[];
      videoRef?: string;
      metrics?: Record<string, number>;
    },
  ) {
    return this.svc.create(tenantId, user.staffId, body);
  }

  @Delete(':id')
  @Roles('admin', 'pm')
  @HttpCode(204)
  @ApiOperation({ summary: '删除私库案例（官方库不可删）' })
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.remove(tenantId, id);
  }
}

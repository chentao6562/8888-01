import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MetricsService, type MetricInput } from './metrics.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import type { RequestUser } from '@/common/types/request-user';

@ApiTags('metrics')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly svc: MetricsService) {}

  @Post('videos/:videoId')
  @Roles('admin', 'pm', 'adops')
  @HttpCode(200)
  @ApiOperation({ summary: '录入某视频某天某平台的数据（upsert）' })
  upsert(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Param('videoId') videoId: string,
    @Body() body: Omit<MetricInput, 'videoId'>,
  ) {
    return this.svc.upsert(tenantId, user.staffId, { ...body, videoId });
  }

  @Post('batch-import')
  @Roles('admin', 'pm', 'adops')
  @HttpCode(200)
  @ApiOperation({ summary: '批量导入（payload 接 Excel 解析后的 JSON）' })
  bulkImport(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { rows: MetricInput[] },
  ) {
    return this.svc.bulkImport(tenantId, user.staffId, body.rows ?? []);
  }

  @Get('videos/:videoId')
  @Roles('admin', 'pm', 'strategist', 'creator', 'adops')
  @ApiOperation({ summary: '某视频时序数据' })
  byVideo(@CurrentTenant() tenantId: string, @Param('videoId') videoId: string) {
    return this.svc.listByVideo(tenantId, videoId);
  }

  @Get('customers/:customerId')
  @Roles('admin', 'pm', 'strategist', 'adops')
  @ApiOperation({ summary: '某客户时段内的数据' })
  byCustomer(
    @CurrentTenant() tenantId: string,
    @Param('customerId') customerId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.listByCustomer(tenantId, customerId, from, to);
  }

  @Post('scan-anomalies')
  @Roles('admin', 'pm', 'adops')
  @HttpCode(200)
  @ApiOperation({ summary: '异常扫描（前 3 天均值 × 50% 为阈值）' })
  scanAnomalies(@CurrentTenant() tenantId: string) {
    return this.svc.scanAnomalies(tenantId);
  }

  @Get('customers/:customerId/aggregate')
  @Roles('admin', 'pm', 'strategist', 'adops')
  @ApiOperation({ summary: '月度聚合（给月报引擎用）' })
  aggregate(
    @CurrentTenant() tenantId: string,
    @Param('customerId') customerId: string,
    @Query('month') month: string,
  ) {
    return this.svc.monthlyAggregate(tenantId, customerId, month);
  }
}

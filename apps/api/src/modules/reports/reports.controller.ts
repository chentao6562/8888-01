import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { UpdateReportDto, GenerateReportDto } from './dto/update-report.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import type { RequestUser } from '@/common/types/request-user';
import type { MonthlyReportStatus } from './entities/monthly-report.entity';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get()
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '月报列表' })
  list(
    @CurrentTenant() tenantId: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: MonthlyReportStatus,
  ) {
    return this.svc.list(tenantId, { customerId, status });
  }

  @Get(':id')
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '月报详情' })
  get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.findById(tenantId, id);
  }

  @Post('generate')
  @Roles('admin', 'pm')
  @HttpCode(200)
  @ApiOperation({ summary: '生成或重生成月报（AI 初稿）' })
  generate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: GenerateReportDto,
  ) {
    return this.svc.generate(tenantId, user.staffId, body.customerId, body.month);
  }

  @Patch(':id')
  @Roles('admin', 'pm')
  @ApiOperation({ summary: 'PM 修订月报（finalContent / sections）' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateReportDto,
  ) {
    return this.svc.update(tenantId, id, body);
  }

  @Post(':id/publish')
  @Roles('admin', 'pm')
  @HttpCode(200)
  @ApiOperation({ summary: '推送月报给客户' })
  publish(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.publish(tenantId, id);
  }

  @Post(':id/mark-read')
  @Roles('admin', 'pm')
  @HttpCode(200)
  @ApiOperation({ summary: '标为已读（phase 7 客户端接通后走 /client/reports/:id/read）' })
  markRead(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.markRead(tenantId, id);
  }
}

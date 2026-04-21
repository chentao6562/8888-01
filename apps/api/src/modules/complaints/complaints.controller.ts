import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto, HandleComplaintDto } from './dto/create-complaint.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import type { RequestUser } from '@/common/types/request-user';
import type { ComplaintStatus } from './entities/complaint.entity';

@ApiTags('complaints')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly svc: ComplaintsService) {}

  @Get()
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '投诉列表' })
  list(
    @CurrentTenant() tenantId: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: ComplaintStatus,
  ) {
    return this.svc.list(tenantId, { customerId, status });
  }

  @Post()
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '新建投诉' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateComplaintDto,
  ) {
    return this.svc.create(tenantId, { ...body, source: 'pm' });
  }

  @Patch(':id/handle')
  @Roles('admin', 'pm')
  @HttpCode(200)
  @ApiOperation({ summary: '处理投诉' })
  handle(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: HandleComplaintDto,
  ) {
    return this.svc.handle(tenantId, id, user.staffId, body.resolution);
  }
}

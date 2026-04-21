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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersDto } from './dto/list-customers.dto';
import { StageTransitionDto } from './dto/stage-transition.dto';
import { CreateFollowUpDto } from './dto/follow-up.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import type { RequestUser } from '@/common/types/request-user';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '客户列表（支持 stage/industry/search/page）' })
  list(@CurrentTenant() tenantId: string, @Query() query: ListCustomersDto) {
    return this.customers.list(tenantId, query);
  }

  @Get('stage-counts')
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '按阶段聚合数量（给 KPI 条用）' })
  stageCounts(@CurrentTenant() tenantId: string) {
    return this.customers.stageCounts(tenantId);
  }

  @Get(':id')
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '客户详情' })
  async detail(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.customers.assertOwnership(tenantId, id, user.staffId, user.role);
  }

  @Post()
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '新建客户（自动落入 lead 阶段）' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customers.create(tenantId, user.staffId, dto);
  }

  @Patch(':id')
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '更新客户基础信息（stage 不可通过此接口改）' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() patch: Partial<CreateCustomerDto>,
  ) {
    return this.customers.update(tenantId, id, patch);
  }

  @Post(':id/stage-transition')
  @Roles('admin', 'pm', 'strategist')
  @HttpCode(200)
  @ApiOperation({ summary: '状态机跳转（不合法跳转返回 409）' })
  transition(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: StageTransitionDto,
  ) {
    return this.customers.transitionStage(tenantId, id, dto.to);
  }

  @Post(':id/archive')
  @Roles('admin', 'pm', 'strategist')
  @HttpCode(200)
  @ApiOperation({ summary: '归档客户（stage → churned）' })
  archive(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.customers.archive(tenantId, id);
  }

  @Post(':id/follow-ups')
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '记录跟进（任意阶段可用）' })
  addFollowUp(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CreateFollowUpDto,
  ) {
    return this.customers.addFollowUp(tenantId, id, user.staffId, dto);
  }

  @Get(':id/follow-ups')
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '跟进记录列表' })
  listFollowUps(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.customers.listFollowUps(tenantId, id);
  }
}

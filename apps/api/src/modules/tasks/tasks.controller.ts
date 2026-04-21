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
import { TasksService } from './tasks.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import type { RequestUser } from '@/common/types/request-user';
import type { TaskStatus, TaskType } from './entities/task.entity';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly svc: TasksService) {}

  @Get()
  @Roles('admin', 'pm', 'strategist', 'creator', 'adops')
  @ApiOperation({ summary: '任务列表（PM 用，可筛 project/assignee/status）' })
  list(
    @CurrentTenant() tenantId: string,
    @Query('projectId') projectId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('status') status?: TaskStatus,
  ) {
    return this.svc.list(tenantId, { projectId, assigneeId, status });
  }

  @Get('mine')
  @Roles('admin', 'pm', 'strategist', 'creator', 'adops')
  @ApiOperation({ summary: '我的任务（按当前 staffId 自动过滤）' })
  mine(@CurrentTenant() tenantId: string, @CurrentUser() user: RequestUser) {
    return this.svc.mine(tenantId, user.staffId);
  }

  @Post()
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '新建任务' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      projectId: string;
      assigneeId: string;
      title: string;
      description?: string;
      dueAt?: string;
      type?: TaskType;
      videoId?: string;
    },
  ) {
    return this.svc.create(tenantId, user.staffId, body);
  }

  @Get(':id')
  @Roles('admin', 'pm', 'strategist', 'creator', 'adops')
  @ApiOperation({ summary: '任务详情' })
  get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.findById(tenantId, id);
  }

  @Patch(':id')
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '编辑任务（标题 / 说明 / 到期 / 负责人）' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; dueAt?: string; assigneeId?: string },
  ) {
    return this.svc.update(tenantId, id, {
      title: body.title,
      description: body.description,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
      assigneeId: body.assigneeId,
    });
  }

  @Post(':id/transition')
  @Roles('admin', 'pm', 'strategist', 'creator', 'adops')
  @HttpCode(200)
  @ApiOperation({ summary: '任务状态机跳转' })
  transition(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { to: TaskStatus },
  ) {
    return this.svc.transition(tenantId, id, body.to);
  }

  @Post('scan-overdue')
  @Roles('admin', 'pm')
  @HttpCode(200)
  @ApiOperation({ summary: '手动触发超期扫描（phase 8 起由定时任务）' })
  scanOverdue(@CurrentTenant() tenantId: string) {
    return this.svc.scanOverdue(tenantId);
  }
}

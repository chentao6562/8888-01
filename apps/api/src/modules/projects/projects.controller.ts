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
import { ProjectsService } from './projects.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import type { RequestUser } from '@/common/types/request-user';
import type { ProjectStatus } from './entities/project.entity';
import type { KickoffMeetingEntity } from './entities/kickoff-meeting.entity';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller()
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  // --- Projects ---
  @Get('projects')
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '项目列表' })
  list(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: ProjectStatus,
  ) {
    return this.svc.list(tenantId, status);
  }

  @Get('projects/:id')
  @Roles('admin', 'pm', 'strategist', 'creator', 'adops')
  @ApiOperation({ summary: '项目详情' })
  get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.findById(tenantId, id);
  }

  @Post('projects')
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '基于合同创建项目（签字或执行中合同可用）' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      contractId: string;
      name?: string;
      startAt?: string;
      endAt?: string;
    },
  ) {
    return this.svc.create(tenantId, user.staffId, {
      contractId: body.contractId,
      name: body.name ?? '新项目',
      startAt: body.startAt ? new Date(body.startAt) : undefined,
      endAt: body.endAt ? new Date(body.endAt) : undefined,
    });
  }

  @Post('projects/:id/transition')
  @Roles('admin', 'pm')
  @HttpCode(200)
  @ApiOperation({ summary: '项目状态机跳转' })
  transition(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { to: ProjectStatus },
  ) {
    return this.svc.transition(tenantId, id, body.to);
  }

  // --- Kickoff ---
  @Post('projects/:id/kickoffs')
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '为项目新建启动会' })
  createKickoff(
    @CurrentTenant() tenantId: string,
    @Param('id') projectId: string,
    @Body() body: Partial<KickoffMeetingEntity>,
  ) {
    return this.svc.createKickoff(tenantId, projectId, body);
  }

  @Get('projects/:id/kickoffs')
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '项目启动会列表' })
  listKickoffs(@CurrentTenant() tenantId: string, @Param('id') projectId: string) {
    return this.svc.listKickoffs(tenantId, projectId);
  }

  @Patch('kickoffs/:id')
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '编辑启动会（定稿前）' })
  updateKickoff(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: Partial<KickoffMeetingEntity>,
  ) {
    return this.svc.updateKickoff(tenantId, id, body);
  }

  @Post('kickoffs/:id/finalize')
  @Roles('admin', 'pm')
  @HttpCode(200)
  @ApiOperation({ summary: '启动会定稿：项目 running + 客户 delivering + 批量派任务' })
  finalizeKickoff(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.svc.finalizeKickoff(tenantId, id, user.staffId);
  }
}

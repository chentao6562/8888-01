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
import { VideosService } from './videos.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import type { VideoStatus } from './entities/video.entity';

@ApiTags('videos')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('videos')
export class VideosController {
  constructor(private readonly svc: VideosService) {}

  @Get()
  @Roles('admin', 'pm', 'strategist', 'creator', 'adops')
  @ApiOperation({ summary: '视频列表' })
  list(
    @CurrentTenant() tenantId: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: VideoStatus,
  ) {
    return this.svc.list(tenantId, { projectId, status });
  }

  @Get(':id')
  @Roles('admin', 'pm', 'strategist', 'creator', 'adops')
  @ApiOperation({ summary: '视频详情' })
  get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.findById(tenantId, id);
  }

  @Post()
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '策划新建视频（planning 态）' })
  create(
    @CurrentTenant() tenantId: string,
    @Body()
    body: {
      projectId: string;
      customerId: string;
      title: string;
      script?: string;
      strategistId?: string;
    },
  ) {
    return this.svc.create(tenantId, body);
  }

  @Patch(':id')
  @Roles('admin', 'pm', 'strategist', 'creator')
  @ApiOperation({ summary: '编辑视频元信息（title/script/角色归属/文案/标题/标签）' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.svc.update(tenantId, id, body);
  }

  @Post(':id/transition')
  @Roles('admin', 'pm', 'strategist', 'creator')
  @HttpCode(200)
  @ApiOperation({ summary: '视频状态机跳转（planning→shooting→editing→pending_review→...）' })
  transition(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { to: VideoStatus },
  ) {
    return this.svc.transition(tenantId, id, body.to);
  }

  @Post(':id/raw-materials')
  @Roles('admin', 'pm', 'creator')
  @HttpCode(200)
  @ApiOperation({ summary: '追加一条原始素材 URL' })
  addRaw(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { url: string },
  ) {
    return this.svc.addRawMaterial(tenantId, id, body.url);
  }

  @Post(':id/final-url')
  @Roles('admin', 'pm', 'creator')
  @HttpCode(200)
  @ApiOperation({ summary: '设置终片 URL' })
  setFinal(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { url: string },
  ) {
    return this.svc.setFinalUrl(tenantId, id, body.url);
  }

  @Post(':id/submit-for-review')
  @Roles('admin', 'pm')
  @HttpCode(200)
  @ApiOperation({ summary: '提交客户审核（editing → pending_review）· phase 7 小程序端接住' })
  submit(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.svc.submitForReview(tenantId, id);
  }
}

import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TeleprompterService } from './teleprompter.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';

@ApiTags('teleprompter')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('teleprompter/videos')
export class TeleprompterController {
  constructor(private readonly svc: TeleprompterService) {}

  @Get(':videoId')
  @Roles('admin', 'pm', 'strategist', 'creator')
  @ApiOperation({ summary: '按句切分视频 script，估总时长（供小程序提词器展示）' })
  get(@CurrentTenant() tenantId: string, @Param('videoId') videoId: string) {
    return this.svc.get(tenantId, videoId);
  }

  @Post(':videoId/segments/:index')
  @Roles('admin', 'pm', 'creator')
  @HttpCode(200)
  @ApiOperation({ summary: '上传某一段录音的 URL（phase 7 小程序端实装）' })
  upload(
    @CurrentTenant() tenantId: string,
    @Param('videoId') videoId: string,
    @Param('index') index: string,
    @Body() body: { url: string },
  ) {
    return this.svc.uploadSegment(tenantId, videoId, Number(index), body.url);
  }
}

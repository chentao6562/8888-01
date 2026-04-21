import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiContentService } from './ai-content.service';
import { LlmService } from '@/modules/llm/llm.service';
import {
  CopywritingDto,
  DialectAdaptDto,
  SensitiveCheckDto,
  TagsDto,
  TitlesDto,
} from './dto/copywriting.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import type { RequestUser } from '@/common/types/request-user';

@ApiTags('ai-content')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('ai')
export class AiContentController {
  constructor(
    private readonly svc: AiContentService,
    private readonly llm: LlmService,
  ) {}

  @Post('copywriting')
  @Roles('admin', 'pm', 'strategist', 'creator')
  @HttpCode(200)
  @ApiOperation({ summary: 'AI 文案（钩子 + 主体 + CTA 三段）' })
  copywriting(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CopywritingDto,
  ) {
    return this.svc.copywriting(tenantId, user.staffId, dto);
  }

  @Post('titles')
  @Roles('admin', 'pm', 'strategist', 'creator')
  @HttpCode(200)
  @ApiOperation({ summary: 'AI 标题（5 候选 + 预期点击率）' })
  titles(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: TitlesDto,
  ) {
    return this.svc.titles(tenantId, user.staffId, dto);
  }

  @Post('tags')
  @Roles('admin', 'pm', 'strategist', 'creator', 'adops')
  @HttpCode(200)
  @ApiOperation({ summary: 'AI 标签推荐（平台 + 行业 + 本地 + 热点）' })
  tags(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: TagsDto,
  ) {
    return this.svc.tags(tenantId, user.staffId, dto);
  }

  @Post('dialect-adapt')
  @Roles('admin', 'pm', 'strategist', 'creator', 'adops')
  @HttpCode(200)
  @ApiOperation({ summary: '方言适配（标准 / 呼市话 / 东北话）' })
  dialect(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: DialectAdaptDto,
  ) {
    return this.svc.dialectAdapt(tenantId, user.staffId, dto);
  }

  @Post('sensitive-check')
  @Roles('admin', 'pm', 'strategist', 'creator', 'adops')
  @HttpCode(200)
  @ApiOperation({ summary: '敏感词检测（独立端点，不消耗 LLM 配额）' })
  sensitiveCheck(@Body() dto: SensitiveCheckDto) {
    return this.svc.checkSensitive(dto.text);
  }

  @Get('usage')
  @Roles('admin', 'pm', 'strategist', 'creator', 'adops')
  @ApiOperation({ summary: '当前租户本月 LLM 用量与上限' })
  usage(@CurrentTenant() tenantId: string) {
    return this.llm.usage(tenantId);
  }
}

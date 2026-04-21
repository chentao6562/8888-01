import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DiagnosisService } from './diagnosis.service';
import { UpdateDiagnosisDto } from './dto/update-diagnosis.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import type { RequestUser } from '@/common/types/request-user';

@ApiTags('diagnosis')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('customers/:customerId/diagnosis')
export class DiagnosisController {
  constructor(private readonly svc: DiagnosisService) {}

  @Post()
  @Roles('admin', 'pm', 'strategist')
  @HttpCode(201)
  @ApiOperation({ summary: '开启诊断（若已存在返回现有，同时客户 stage → diagnosing）' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Param('customerId') customerId: string,
  ) {
    return this.svc.create(tenantId, customerId, user.staffId);
  }

  @Get()
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '诊断详情' })
  get(@CurrentTenant() tenantId: string, @Param('customerId') customerId: string) {
    return this.svc.findByCustomerOrFail(tenantId, customerId);
  }

  @Patch()
  @Roles('admin', 'pm', 'strategist')
  @ApiOperation({ summary: '更新 4 把刀 / 4 张卡 / 报告内容' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateDiagnosisDto,
  ) {
    return this.svc.update(tenantId, customerId, dto);
  }

  @Post('interview')
  @Roles('admin', 'pm', 'strategist')
  @HttpCode(200)
  @ApiOperation({ summary: 'AI 访谈预问卷生成（phase 2 mock · phase 4 接真 LLM）' })
  interview(
    @CurrentTenant() tenantId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.svc.generateInterview(tenantId, customerId);
  }

  @Post('generate-report')
  @Roles('admin', 'pm', 'strategist')
  @HttpCode(200)
  @ApiOperation({ summary: 'AI 诊断报告初稿生成（需要 4 刀 + 4 卡齐全）' })
  generate(
    @CurrentTenant() tenantId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.svc.generateReport(tenantId, customerId);
  }

  @Post('complete')
  @Roles('admin', 'pm', 'strategist')
  @HttpCode(200)
  @ApiOperation({ summary: '完成诊断 → 客户 stage → proposing' })
  complete(
    @CurrentTenant() tenantId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.svc.complete(tenantId, customerId);
  }
}

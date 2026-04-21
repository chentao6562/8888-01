import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { AuditService } from '@/modules/audit/audit.service';
import { EncryptionService } from '@/common/encryption/encryption.service';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import type { RequestUser } from '@/common/types/request-user';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('staff')
export class StaffController {
  constructor(
    private readonly staff: StaffService,
    private readonly audit: AuditService,
    private readonly encryption: EncryptionService,
  ) {}

  @Get()
  @Roles('admin', 'pm')
  @ApiOperation({ summary: '员工列表' })
  list(@CurrentTenant() tenantId: string) {
    return this.staff.listByTenant(tenantId);
  }

  @Post('invite')
  @Roles('admin')
  @ApiOperation({ summary: '邀请新员工（mock：邀请链接返回在响应体 + console.log）' })
  async invite(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: InviteStaffDto,
  ) {
    const result = await this.staff.invite({
      tenantId,
      invitedBy: user.staffId,
      ...dto,
    });
    const masked = this.encryption.maskPhone(dto.phone);
    // eslint-disable-next-line no-console
    console.info(`[invite] 邀请链接（发送给 ${masked}）→ ${result.inviteLink}`);
    await this.audit.log({
      tenantId,
      staffId: user.staffId,
      action: 'staff.invited',
      detail: `invite ${masked} as ${dto.role}`,
    });
    return result;
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: '更新员工角色或状态' })
  async update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    let staff = await this.staff.findById(id, tenantId);
    if (!staff) {
      // fallthrough to let service throw canonical NotFoundException
      await this.staff.updateRole(id, tenantId, dto.role ?? 'pm');
    }
    if (dto.role) {
      staff = await this.staff.updateRole(id, tenantId, dto.role);
      await this.audit.log({
        tenantId,
        staffId: user.staffId,
        action: 'staff.role_changed',
        detail: `staff=${id} role=${dto.role}`,
      });
    }
    if (dto.status) {
      staff = await this.staff.updateStatus(id, tenantId, dto.status);
      await this.audit.log({
        tenantId,
        staffId: user.staffId,
        action: 'staff.status_changed',
        detail: `staff=${id} status=${dto.status}`,
      });
    }
    return staff;
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  @ApiOperation({ summary: '删除员工' })
  async remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    await this.staff.remove(id, tenantId);
    await this.audit.log({
      tenantId,
      staffId: user.staffId,
      action: 'staff.removed',
      detail: `staff=${id}`,
    });
  }
}

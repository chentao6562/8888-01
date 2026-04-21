import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { StaffEntity, StaffRole, StaffStatus } from './entities/staff.entity';
import { TenantsService } from '@/modules/tenants/tenants.service';

const INVITE_TOKEN_TTL_DAYS = 7;

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(StaffEntity)
    private readonly repo: Repository<StaffEntity>,
    private readonly tenants: TenantsService,
  ) {}

  async listByTenant(tenantId: string): Promise<StaffEntity[]> {
    return this.repo.find({ where: { tenantId }, order: { createdAt: 'ASC' } });
  }

  async findById(id: string, tenantId: string): Promise<StaffEntity | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  async findByUserId(userId: string): Promise<StaffEntity | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async findByInviteToken(token: string): Promise<StaffEntity | null> {
    return this.repo.findOne({ where: { inviteToken: token } });
  }

  async assertUniquePhoneInTenant(tenantId: string, phone: string): Promise<void> {
    const existing = await this.repo.findOne({ where: { tenantId, phone } });
    if (existing) {
      throw new ConflictException({
        code: 'STAFF_PHONE_TAKEN',
        message: '该手机号已在本公司',
      });
    }
  }

  async createAdminFor(
    tenantId: string,
    params: { userId: string; name: string; phone: string; email?: string | null },
  ): Promise<StaffEntity> {
    const staff = this.repo.create({
      tenantId,
      userId: params.userId,
      name: params.name,
      phone: params.phone,
      email: params.email ?? null,
      role: 'admin',
      status: 'active',
      joinedAt: new Date(),
    });
    return this.repo.save(staff);
  }

  async invite(params: {
    tenantId: string;
    invitedBy: string;
    name: string;
    phone: string;
    email?: string | null;
    role: StaffRole;
  }): Promise<StaffEntity & { inviteLink: string }> {
    await this.assertUniquePhoneInTenant(params.tenantId, params.phone);
    await this.assertUnderStaffLimit(params.tenantId);
    const token = randomBytes(24).toString('hex');
    const staff = this.repo.create({
      tenantId: params.tenantId,
      name: params.name,
      phone: params.phone,
      email: params.email ?? null,
      role: params.role,
      status: 'invited',
      inviteToken: token,
      inviteExpiresAt: new Date(Date.now() + INVITE_TOKEN_TTL_DAYS * 24 * 3600 * 1000),
      invitedBy: params.invitedBy,
    });
    const saved = await this.repo.save(staff);
    const inviteLink = `http://localhost:5173/accept-invite?token=${token}`;
    return Object.assign(saved, { inviteLink });
  }

  async consumeInviteToken(token: string): Promise<StaffEntity> {
    const staff = await this.findByInviteToken(token);
    if (!staff) {
      throw new NotFoundException({ code: 'INVITE_INVALID', message: '邀请不存在或已使用' });
    }
    if (staff.status !== 'invited') {
      throw new ConflictException({ code: 'INVITE_ALREADY_USED', message: '邀请已被使用' });
    }
    if (staff.inviteExpiresAt && staff.inviteExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException({ code: 'INVITE_EXPIRED', message: '邀请已过期' });
    }
    return staff;
  }

  async bindUserToInvite(staffId: string, userId: string): Promise<StaffEntity> {
    const staff = await this.repo.findOne({ where: { id: staffId } });
    if (!staff) throw new NotFoundException({ code: 'STAFF_NOT_FOUND', message: '员工不存在' });
    staff.userId = userId;
    staff.status = 'active';
    staff.inviteToken = null;
    staff.inviteExpiresAt = null;
    staff.joinedAt = new Date();
    return this.repo.save(staff);
  }

  async updateRole(id: string, tenantId: string, role: StaffRole): Promise<StaffEntity> {
    const staff = await this.findById(id, tenantId);
    if (!staff) throw new NotFoundException({ code: 'STAFF_NOT_FOUND', message: '员工不存在' });
    staff.role = role;
    return this.repo.save(staff);
  }

  async updateStatus(id: string, tenantId: string, status: StaffStatus): Promise<StaffEntity> {
    const staff = await this.findById(id, tenantId);
    if (!staff) throw new NotFoundException({ code: 'STAFF_NOT_FOUND', message: '员工不存在' });
    staff.status = status;
    return this.repo.save(staff);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const tenant = await this.tenants.findById(tenantId);
    if (tenant?.ownerId === id) {
      throw new ForbiddenException({
        code: 'CANNOT_REMOVE_OWNER',
        message: '不可删除租户创始管理员',
      });
    }
    await this.repo.delete({ id, tenantId });
  }

  async countActive(tenantId: string): Promise<number> {
    return this.repo.count({ where: [{ tenantId, status: 'active' }, { tenantId, status: 'invited' }] });
  }

  async assertUnderStaffLimit(tenantId: string): Promise<void> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) throw new NotFoundException({ code: 'TENANT_NOT_FOUND', message: '租户不存在' });
    const current = await this.countActive(tenantId);
    if (current >= tenant.maxStaff) {
      throw new ForbiddenException({
        code: 'STAFF_LIMIT_REACHED',
        message: `当前档位 ${tenant.plan} 最多 ${tenant.maxStaff} 个员工`,
      });
    }
  }

  /** 返回未被软删除的员工（仅占位，phase 1 暂不软删除）。 */
  async listOrphans(): Promise<StaffEntity[]> {
    return this.repo.find({ where: { userId: IsNull() } });
  }
}

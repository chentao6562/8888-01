import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { UsersService } from '@/modules/users/users.service';
import { TenantsService } from '@/modules/tenants/tenants.service';
import { StaffService } from '@/modules/staff/staff.service';
import { AuditService } from '@/modules/audit/audit.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { UserEntity } from '@/modules/users/entities/user.entity';
import { TenantEntity } from '@/modules/tenants/entities/tenant.entity';
import { StaffEntity } from '@/modules/staff/entities/staff.entity';
import { PLAN_MAX_STAFF } from '@/modules/tenants/entities/tenant.entity';
import type { JwtPayload, StaffJwtPayload } from './strategies/jwt.strategy';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthSession extends AuthTokens {
  user: {
    id: string;
    staffId: string;
    tenantId: string;
    name: string;
    role: StaffEntity['role'];
    phone: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly users: UsersService,
    private readonly tenants: TenantsService,
    private readonly staff: StaffService,
    private readonly audit: AuditService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** 注册公司 + 创建管理员（事务保证原子）。 */
  async registerTenant(dto: RegisterTenantDto): Promise<AuthSession> {
    const existing = await this.users.findByPhone(dto.phone);
    if (existing) {
      throw new BadRequestException({
        code: 'USER_PHONE_TAKEN',
        message: '该手机号已注册，请直接登录',
      });
    }

    return this.dataSource.transaction(async (manager) => {
      // 1. 创建 User（bcrypt 由 UsersService 处理）
      const user = await this.users.create({
        phone: dto.phone,
        password: dto.password,
        email: dto.contactEmail ?? null,
      });

      // 2. 创建 Tenant
      const tenantRepo = manager.getRepository(TenantEntity);
      const tenant = await tenantRepo.save(
        tenantRepo.create({
          name: dto.companyName,
          plan: dto.plan,
          maxStaff: PLAN_MAX_STAFF[dto.plan],
          contactPhone: dto.phone,
          contactEmail: dto.contactEmail ?? null,
          status: 'active',
        }),
      );

      // 3. 创建 Staff（admin）
      const staffRepo = manager.getRepository(StaffEntity);
      const staff = await staffRepo.save(
        staffRepo.create({
          tenantId: tenant.id,
          userId: user.id,
          name: dto.adminName,
          phone: dto.phone,
          email: dto.contactEmail ?? null,
          role: 'admin',
          status: 'active',
          joinedAt: new Date(),
        }),
      );

      // 4. 回填 tenant.owner_id
      tenant.ownerId = staff.id;
      await tenantRepo.save(tenant);

      await this.audit.log({
        tenantId: tenant.id,
        userId: user.id,
        staffId: staff.id,
        action: 'tenant.registered',
        detail: `company=${dto.companyName} plan=${dto.plan}`,
      });

      return this.issueSession(user, staff, tenant);
    });
  }

  async login(phone: string, password: string, ip?: string, ua?: string): Promise<AuthSession> {
    const user = await this.users.findByPhone(phone);
    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: '手机号或密码错误',
      });
    }
    if (this.users.isLocked(user)) {
      throw new ForbiddenException({
        code: 'ACCOUNT_LOCKED',
        message: '账号已锁定，30 分钟后重试',
      });
    }

    const ok = await this.users.verifyPassword(user, password);
    if (!ok) {
      await this.users.handleLoginFailure(user);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: '手机号或密码错误',
      });
    }

    const staff = await this.staff.findByUserId(user.id);
    if (!staff) {
      throw new UnauthorizedException({
        code: 'STAFF_NOT_FOUND',
        message: '当前账号未关联任何公司',
      });
    }
    if (staff.status === 'disabled') {
      throw new ForbiddenException({ code: 'STAFF_DISABLED', message: '账号已被禁用' });
    }

    const tenant = await this.tenants.findById(staff.tenantId);
    if (!tenant || tenant.status !== 'active') {
      throw new ForbiddenException({ code: 'TENANT_INACTIVE', message: '所属公司已停用' });
    }

    await this.users.handleLoginSuccess(user);
    await this.audit.log({
      tenantId: tenant.id,
      userId: user.id,
      staffId: staff.id,
      action: 'auth.login',
      detail: `ok`,
      ip: ip ?? null,
      userAgent: ua ?? null,
    });

    return this.issueSession(user, staff, tenant);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.secret'),
      });
    } catch {
      throw new UnauthorizedException({ code: 'TOKEN_EXPIRED', message: 'refresh token 无效' });
    }
    if (payload.role === 'customer') {
      throw new UnauthorizedException({ code: 'TOKEN_INVALID', message: '客户端 token 不可用于管理端刷新' });
    }
    const staffPayload = payload as StaffJwtPayload;
    const staff = await this.staff.findById(staffPayload.staffId, staffPayload.tenantId);
    if (!staff || staff.status === 'disabled') {
      throw new UnauthorizedException({ code: 'STAFF_DISABLED', message: '员工已禁用' });
    }
    return this.issueTokens({
      userId: staffPayload.userId,
      staffId: staff.id,
      tenantId: staff.tenantId,
      role: staff.role,
    });
  }

  async acceptInvite(token: string, password: string): Promise<AuthSession> {
    const staff = await this.staff.consumeInviteToken(token);
    // 创建 user
    const existing = await this.users.findByPhone(staff.phone);
    if (existing) {
      throw new BadRequestException({
        code: 'USER_PHONE_TAKEN',
        message: '该手机号已存在，请联系管理员',
      });
    }
    const user = await this.users.create({
      phone: staff.phone,
      password,
      email: staff.email ?? null,
    });
    const bound = await this.staff.bindUserToInvite(staff.id, user.id);
    const tenant = await this.tenants.findById(bound.tenantId);
    if (!tenant) {
      throw new UnauthorizedException({ code: 'TENANT_NOT_FOUND', message: '租户不存在' });
    }
    await this.audit.log({
      tenantId: tenant.id,
      userId: user.id,
      staffId: bound.id,
      action: 'staff.accepted_invite',
      detail: `role=${bound.role}`,
    });
    return this.issueSession(user, bound, tenant);
  }

  async meSnapshot(payload: StaffJwtPayload) {
    const staff = await this.staff.findById(payload.staffId, payload.tenantId);
    const tenant = await this.tenants.findById(payload.tenantId);
    return {
      userId: payload.userId,
      staff: staff && {
        id: staff.id,
        name: staff.name,
        phone: staff.phone,
        role: staff.role,
        status: staff.status,
      },
      tenant: tenant && {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
        maxStaff: tenant.maxStaff,
      },
    };
  }

  private async issueSession(
    user: UserEntity,
    staff: StaffEntity,
    tenant: TenantEntity,
  ): Promise<AuthSession> {
    const tokens = await this.issueTokens({
      userId: user.id,
      staffId: staff.id,
      tenantId: tenant.id,
      role: staff.role,
    });
    return {
      ...tokens,
      user: {
        id: user.id,
        staffId: staff.id,
        tenantId: tenant.id,
        name: staff.name,
        role: staff.role,
        phone: staff.phone,
      },
    };
  }

  private async issueTokens(payload: StaffJwtPayload): Promise<AuthTokens> {
    const secret = this.config.get<string>('jwt.secret') ?? 'dev';
    const expiresIn = this.config.get<string>('jwt.expiresIn') ?? '1h';
    const refreshExpiresIn = this.config.get<string>('jwt.refreshExpiresIn') ?? '30d';
    const accessToken = await this.jwt.signAsync(payload, {
      secret,
      expiresIn: expiresIn as unknown as number,
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret,
      expiresIn: refreshExpiresIn as unknown as number,
    });
    return { accessToken, refreshToken, expiresIn: this.ttlSeconds(expiresIn) };
  }

  private ttlSeconds(spec: string): number {
    const m = /^(\d+)(s|m|h|d)$/.exec(spec);
    if (!m) return 3600;
    const n = Number(m[1]);
    const unit = m[2];
    return unit === 's' ? n : unit === 'm' ? n * 60 : unit === 'h' ? n * 3600 : n * 86400;
  }
}

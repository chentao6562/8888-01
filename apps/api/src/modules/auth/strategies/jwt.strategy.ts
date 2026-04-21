import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { RequestUser } from '@/common/types/request-user';
import { StaffService } from '@/modules/staff/staff.service';

/**
 * 联合负载：
 *  - staff（管理端）· role in StaffRole · staffId
 *  - customer（小程序客户端 phase 7+）· role='customer' · customerUserId + customerId
 */
export interface StaffJwtPayload extends RequestUser {
  iat?: number;
  exp?: number;
}

export interface CustomerJwtPayload {
  customerUserId: string;
  customerId: string;
  tenantId: string;
  role: 'customer';
  iat?: number;
  exp?: number;
}

export type JwtPayload = StaffJwtPayload | CustomerJwtPayload;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly staff: StaffService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret') ?? 'dev',
      // 锁死 HS256，拒绝 alg=none 与算法替换攻击
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser | (CustomerJwtPayload & { role: 'customer' })> {
    if (payload.role === 'customer') {
      // 客户端：无需额外校验（customerUser 删除后 phase 8 可加）
      return {
        customerUserId: (payload as CustomerJwtPayload).customerUserId,
        customerId: (payload as CustomerJwtPayload).customerId,
        tenantId: payload.tenantId,
        role: 'customer',
      };
    }
    // 员工：校验状态
    const p = payload as StaffJwtPayload;
    const staff = await this.staff.findById(p.staffId, p.tenantId);
    if (!staff) {
      throw new UnauthorizedException({ code: 'STAFF_NOT_FOUND', message: '员工已不存在' });
    }
    if (staff.status === 'disabled') {
      throw new UnauthorizedException({ code: 'STAFF_DISABLED', message: '账号已被禁用' });
    }
    return {
      userId: p.userId,
      staffId: p.staffId,
      tenantId: p.tenantId,
      role: staff.role,
    };
  }
}

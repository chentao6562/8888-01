import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './entities/user.entity';

const BCRYPT_COST = 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 30;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async findByPhone(phone: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { phone } });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(params: {
    phone: string;
    password: string;
    email?: string | null;
  }): Promise<UserEntity> {
    const existing = await this.findByPhone(params.phone);
    if (existing) {
      throw new ConflictException({ code: 'USER_PHONE_TAKEN', message: '该手机号已注册' });
    }
    const passwordHash = await bcrypt.hash(params.password, BCRYPT_COST);
    const user = this.repo.create({
      phone: params.phone,
      passwordHash,
      email: params.email ?? null,
      status: 'active',
    });
    return this.repo.save(user);
  }

  async verifyPassword(user: UserEntity, plain: string): Promise<boolean> {
    return bcrypt.compare(plain, user.passwordHash);
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: '用户不存在' });
    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    user.failedAttempts = 0;
    user.lockedUntil = null;
    user.status = 'active';
    await this.repo.save(user);
  }

  /** 登录失败 → 计数；到阈值锁 30 分钟。 */
  async handleLoginFailure(user: UserEntity): Promise<void> {
    user.failedAttempts += 1;
    if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      user.status = 'locked';
      user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
    }
    await this.repo.save(user);
  }

  /** 登录成功 → 清零计数 + 打时间戳。 */
  async handleLoginSuccess(user: UserEntity): Promise<void> {
    user.failedAttempts = 0;
    user.lastLoginAt = new Date();
    await this.repo.save(user);
  }

  isLocked(user: UserEntity): boolean {
    if (user.status !== 'locked') return false;
    if (user.lockedUntil && user.lockedUntil.getTime() < Date.now()) {
      // 自动解锁
      user.status = 'active';
      user.failedAttempts = 0;
      user.lockedUntil = null;
      void this.repo.save(user);
      return false;
    }
    return true;
  }
}

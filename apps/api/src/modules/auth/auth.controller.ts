import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantGuard } from '@/common/guards/tenant.guard';
import { RateLimit } from '@/common/guards/rate-limit.guard';
import type { RequestUser } from '@/common/types/request-user';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register-tenant')
  @RateLimit({ windowSec: 3600, max: 5 })
  @ApiOperation({ summary: '注册公司 + 默认管理员' })
  register(@Body() dto: RegisterTenantDto) {
    return this.auth.registerTenant(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @RateLimit({ windowSec: 60, max: 10 })
  @ApiOperation({ summary: '手机 + 密码登录' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const ua = req.headers['user-agent']?.toString();
    const ip = req.ip;
    return this.auth.login(dto.phone, dto.password, ip, ua);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: '刷新 access token' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post('accept-invite')
  @HttpCode(200)
  @ApiOperation({ summary: '接受邀请，设置密码 + 自动登录' })
  accept(@Body() dto: AcceptInviteDto) {
    return this.auth.acceptInvite(dto.token, dto.password);
  }

  @UseGuards(TenantGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '当前登录上下文（user + staff + tenant）' })
  me(@CurrentUser() user: RequestUser) {
    return this.auth.meSnapshot(user);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: '登出（stateless：客户端丢 token 即可；此端点用于埋点）' })
  logout() {
    // stateless JWT, nothing to invalidate server-side in MVP
    return;
  }
}

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'node:path';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';

/** 生产 bootstrap 前置 env 校验：缺关键变量直接退出，不进入半残状态。 */
function validateProdEnv(): void {
  const missing: string[] = [];
  const weak: string[] = [];

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) weak.push('JWT_SECRET (≥32 chars)');
  if (!process.env.ENCRYPTION_KEY) missing.push('ENCRYPTION_KEY (base64 32 bytes)');
  if (!process.env.CORS_ALLOWED_ORIGINS) missing.push('CORS_ALLOWED_ORIGINS (CSV)');
  if (!process.env.DB_PASSWORD || ['mindlink_dev', 'dev', 'password'].includes(process.env.DB_PASSWORD)) {
    weak.push('DB_PASSWORD (non-default)');
  }

  if (missing.length || weak.length) {
    const lines = [
      '',
      '═══════════════════════════════════════════════════════════',
      '✗ BOOTSTRAP_PRODUCTION_ENV_INVALID',
      '═══════════════════════════════════════════════════════════',
    ];
    if (missing.length) {
      lines.push('缺少必填环境变量：');
      missing.forEach((k) => lines.push(`  - ${k}`));
    }
    if (weak.length) {
      lines.push('以下变量值不安全（默认/弱口令）：');
      weak.forEach((k) => lines.push(`  - ${k}`));
    }
    lines.push('参见 .env.production.example');
    lines.push('═══════════════════════════════════════════════════════════');
    // eslint-disable-next-line no-console
    console.error(lines.join('\n'));
    throw new Error('BOOTSTRAP_PRODUCTION_ENV_INVALID');
  }
}

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) validateProdEnv();

  const corsOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean);

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: isProd
      ? {
          origin: corsOrigins,
          credentials: true,
          methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        }
      : true,
  });

  // 安全响应头（替代 helmet · phase 8 可接正式包）
  const sec = new SecurityHeadersMiddleware();
  app.use((req: Request, res: Response, next: NextFunction) => sec.use(req, res, next));

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // 信任代理（K8s ingress / nginx 后），让 req.ip 取 X-Forwarded-For
  if (isProd) app.set('trust proxy', 1);

  // 本地上传静态资源。生产用 OSS/COS 后此处只保留开发环境使用。
  if (!isProd) {
    app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  }

  // Swagger 仅在非生产或显式开启时挂载
  if (!isProd || process.env.SWAGGER_ENABLED === '1') {
    const config = new DocumentBuilder()
      .setTitle('MindLink API')
      .setDescription('代运营协同系统 · 后端接口文档')
      .setVersion('0.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.info(`[MindLink] API 监听 http://localhost:${port} · NODE_ENV=${process.env.NODE_ENV ?? 'development'}`);
  // eslint-disable-next-line no-console
  console.info(`[MindLink] 健康检查 http://localhost:${port}/api/v1/health`);
  if (!isProd) {
    // eslint-disable-next-line no-console
    console.info(`[MindLink] Swagger http://localhost:${port}/api/docs`);
  }
}

bootstrap();

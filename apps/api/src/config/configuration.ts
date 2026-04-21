import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export interface AppConfig {
  port: number;
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  db: TypeOrmModuleOptions;
}

/**
 * 支持两种数据库：
 * - dev/test 默认 SQLite（better-sqlite3，零依赖，`pnpm dev` 即可跑）
 * - 当 DB_DRIVER=postgres 或 NODE_ENV=production 时切换到 PG
 */
export default (): AppConfig => {
  const isProd = process.env.NODE_ENV === 'production';
  const driver = process.env.DB_DRIVER ?? (isProd ? 'postgres' : 'sqlite');

  let db: TypeOrmModuleOptions;
  if (driver === 'postgres') {
    db = {
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'mindlink',
      password: process.env.DB_PASSWORD ?? 'mindlink_dev',
      database: process.env.DB_DATABASE ?? 'mindlink',
      autoLoadEntities: true,
      synchronize: !isProd,
      logging: process.env.DB_LOGGING === 'true',
    };
  } else {
    db = {
      type: 'better-sqlite3',
      database: process.env.DB_SQLITE_PATH ?? 'dev.sqlite',
      autoLoadEntities: true,
      synchronize: true,
      logging: process.env.DB_LOGGING === 'true',
    };
  }

  return {
    port: Number(process.env.API_PORT ?? 3000),
    jwt: {
      secret: process.env.JWT_SECRET ?? 'mindlink-dev-secret-change-me',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
    },
    db,
  };
};

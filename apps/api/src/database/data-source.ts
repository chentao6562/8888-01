/**
 * TypeORM DataSource 声明（本 phase 仅占位，phase 1 开始挂载实体）。
 * 通过 `new DataSource(options)` 创建，供 TypeORM CLI 迁移使用。
 */
export const dataSourceOptions = {
  type: 'postgres' as const,
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'mindlink',
  password: process.env.DB_PASSWORD ?? 'mindlink_dev',
  database: process.env.DB_DATABASE ?? 'mindlink',
  entities: [],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

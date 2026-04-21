/**
 * 跨方言列类型常量。
 *
 * Postgres 用 `timestamp`、Sqlite 用 `datetime` · TypeORM 严格校验，
 * 不跨方言转换。这里根据 env 在模块加载时一次性决定，供所有 entity 共享。
 *
 * 在 entity 装饰器参数里用：
 *   @Column({ type: DATETIME, nullable: true })
 */
export const IS_POSTGRES =
  process.env.DB_DRIVER === 'postgres' ||
  (!process.env.DB_DRIVER && process.env.NODE_ENV === 'production');

export const DATETIME: 'timestamp' | 'datetime' = IS_POSTGRES ? 'timestamp' : 'datetime';
export const TINYINT: 'smallint' | 'tinyint' = IS_POSTGRES ? 'smallint' : 'tinyint';
export const FLOAT: 'real' | 'float' = IS_POSTGRES ? 'real' : 'float';

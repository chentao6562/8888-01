# Runbook · 备份与恢复

## 备份策略

| 项目 | 频率 | 保留 | 位置 |
|---|---|---|---|
| PG 全量 | 每日 02:30 | 30 天 | OSS · `s3://mindlink-backups/pg/` |
| PG WAL 增量 | 每 5 分钟 | 7 天 | OSS · `s3://mindlink-backups/wal/` |
| Redis snapshot（RDB） | 每小时 | 24 h | 持久卷 |
| 业务素材（OSS） | 跨区域复制 | 永久 | OSS 跨区 |
| K8s 配置 | 每次变更 | git 永久 | GitHub `infra/k8s` |

## 备份执行（CronJob 自动）

`infra/k8s/cronjobs.yaml` 已声明 `pg-backup-daily`。

手动一次性备份：
```bash
bash infra/scripts/db-backup.sh
```

## 恢复演练（每季度执行 1 次）

### 1. 全量恢复到测试库

```bash
# 1.1 从 OSS 拉最近的 dump
coscmd download /mindlink-backups/pg/mindlink-20261231-0230.dump.gz /tmp/

# 1.2 解压并恢复
gunzip /tmp/mindlink-20261231-0230.dump.gz
createdb mindlink_restore_test
pg_restore -d mindlink_restore_test /tmp/mindlink-20261231-0230.dump

# 1.3 校验关键表行数
psql -d mindlink_restore_test -c "
  SELECT 'tenants' AS t, count(*) FROM tenants
  UNION ALL SELECT 'customers', count(*) FROM customers
  UNION ALL SELECT 'contracts', count(*) FROM contracts
  UNION ALL SELECT 'monthly_reports', count(*) FROM monthly_reports;
"
```

### 2. 时点恢复（PITR）

```bash
# 2.1 恢复指定时间点（需 WAL 归档）
recovery_target_time = '2026-12-31 14:30:00 Asia/Shanghai'

# 2.2 启动 PG，应用 WAL 直到目标时间
# 详见 PostgreSQL 文档 26.3 节
```

### 3. 演练检查清单

- [ ] 备份文件能正常解压
- [ ] pg_restore 完成无错
- [ ] 关键表行数与生产一致（容差 ±1%）
- [ ] 抽样查 5 条客户、5 条合同、3 条月报，字段完整
- [ ] 把恢复时间记入本文档

## 演练历史

| 日期 | 备份大小 | 恢复时长 | 备注 |
|---|---|---|---|
| _待补_ | _待补_ | _待补_ | _待补_ |

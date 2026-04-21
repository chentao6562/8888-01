# Runbook · 扩容策略

## 容量基线（Beta 阶段）

| 维度 | 起始 | 触发扩容阈值 |
|---|---|---|
| API pod | 2 副本 · 0.2 CPU · 256Mi | CPU > 70% 持续 5min（HPA 已配） |
| Admin Web pod | 2 副本 · 0.05 CPU · 32Mi | 一般无瓶颈 |
| PG | 1 主 · 4Gi | 连接 > 80 / 写入 > 100 TPS / 磁盘 > 70% |
| Redis | 1 副本 · 768Mi | 内存 > 80% |
| Ingress | 默认 | RPS 持续 > 200 |

## 扩容操作

### API 水平扩

HPA 已生效（CPU 70%）。手动强制：

```bash
kubectl -n mindlink scale deploy/mindlink-api --replicas=4
# HPA 会在压力下降后自动收缩
```

### API 垂直扩

```bash
kubectl -n mindlink set resources deploy/mindlink-api \
  --requests=cpu=400m,memory=512Mi --limits=cpu=2000m,memory=2Gi
```

### PG 升级

云托管 PG → 控制台升配（无需停机，5-10 min 切换主备）。
自建 StatefulSet → 备份 + 重建（停机窗口）。

### 慢查询优化

```sql
-- 看 top 10 慢查询
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

常见缺失索引候选：
- `customers (tenant_id, stage, last_contact_at)` 线索池排序
- `videos (tenant_id, customer_id, status)` 客户端待审查询
- `audit_logs (tenant_id, action, created_at)` 审计回溯

## 流量预估

| 用户规模 | 同时在线 | API QPS | 推荐配置 |
|---|---|---|---|
| 3 家 Beta · 30 人 | 5 | 5 | 2 pod 起步 |
| 30 家 · 300 人 | 30 | 50 | 4 pod + Redis 1G |
| 100 家 · 1000 人 | 100 | 200 | 6-8 pod + PG 8 核 |
| 300 家 · 3000 人 | 300 | 600 | HPA 上限调到 16 + PG 主从分离 |

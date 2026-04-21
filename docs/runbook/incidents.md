# Runbook · 故障响应 SOP

## 严重级别

| 级别 | 定义 | 响应时间 | 修复时间目标 |
|---|---|---|---|
| P0 | 全部用户不可用 / 数据丢失 / 安全事故 | 5 min | 1 h 缓解 · 24 h 根治 |
| P1 | 关键功能不可用（登录 · 合同 · 月报 · 付款） | 15 min | 2 h |
| P2 | 单功能降级，有 workaround | 1 h | 1 工作日 |
| P3 | UI 小瑕疵 / 文案 / 体验 | 1 工作日 | 1 周 |

## 标准响应流程

1. **接报**：飞书机器人告警 / 客户工单 / on-call 主动发现
2. **定级**：on-call 30s 内定级（不确定就高一档）
3. **拉群**：飞书群 `#mindlink-incidents-<日期>` · 拉关键人 + 客户接口人
4. **调查**：
   - 看 Grafana：QPS / 5xx 率 / DB 连接池 / Redis
   - 看 Sentry：最新 error trace
   - 看 K8s：`kubectl get events -n mindlink --sort-by=.lastTimestamp`
   - 看审计日志：`SELECT action, count(*) FROM audit_logs WHERE created_at > now()-interval '15 min' GROUP BY 1`
5. **缓解**：先止血（回滚 / 限流 / 切备 provider），再根治
6. **通告**：每 15 分钟在群里 update（即使没新进展）
7. **结案**：24h 内复盘文档归档到本文件下方

## 常见故障预案

### LLM 服务不可用

- 现象：`/ai/*` 全 5xx + Sentry 大量 timeout
- 缓解：`kubectl set env deploy/mindlink-api LLM_PROVIDER=mock` → mock 接管
- 根治：联系 provider · 长期接 fallback provider 多源

### 电子签回调签名失败

- 现象：合同状态卡 `pending_sign`，客户已签但系统未更新
- 缓解：管理员后台手动调用 `/contracts/:id/state` to=`signed`
- 根治：核对 FADADA_APP_SECRET 是否轮换 · 重算 HMAC 调试

### PG 连接池满

- 现象：API 5xx + 错误 `remaining connection slots are reserved`
- 缓解：`kubectl scale deploy/mindlink-api --replicas=4`（水平扩）+ kill 长连接
- 根治：定位慢查询、加索引、调 pool size

### Redis OOM

- 现象：缓存 set 失败 + 驾驶舱响应变慢
- 缓解：`redis-cli --bigkeys` 找出大 key + flush
- 根治：调 maxmemory + maxmemory-policy

### 月报定时推送失败

- 现象：客户没收到推送
- 缓解：管理员手动调 `/api/v1/reports/push-due`
- 根治：看 CronJob 日志 + 检查微信订阅消息模板有效期

## 历史 INCIDENT 归档（按月）

> 暂无（Beta 上线后逐条补录）

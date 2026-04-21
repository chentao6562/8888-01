# Runbook · 回滚 SOP

## 触发条件

任一项命中：
- 5xx 错误率持续 5 分钟 > 1%
- P95 延迟持续 10 分钟 > 1.5s
- 关键路径报障：登录、合同签字、月报推送、付款记录
- 数据丢失或数据泄漏的早期信号

## 决策流程

1. **on-call 接到告警** → 立即在飞书 #mindlink-incidents 起线索
2. **5 分钟内**：定位到具体引入版本（看 GitHub Actions 部署历史）
3. **10 分钟内**：决定 *回滚* vs *修复前进*
   - 数据无损 + 影响 ≥ 1 个 tenant → **回滚优先**
   - 仅个别功能 + 已知 hotfix 30 分钟内可发 → **前进**
4. **回滚执行**：见下文

## 应用层回滚

```bash
# 上一版本（最快）
kubectl -n mindlink rollout undo deploy/mindlink-api
kubectl -n mindlink rollout undo deploy/mindlink-admin-web

# 指定版本（精准）
kubectl -n mindlink set image deploy/mindlink-api \
  api=$REGISTRY/mindlink/api:<known-good-tag>

# 验证
kubectl -n mindlink rollout status deploy/mindlink-api --timeout=120s
curl -fsS https://api.mindlink.example.com/api/v1/health
```

## 数据库回滚

⚠️ **风险高 · 仅 P0 必要时执行**。优先尝试 *向前修复* 而非回滚 schema。

```bash
# 1. 立即停写（缩到 0 副本）
kubectl -n mindlink scale deploy/mindlink-api --replicas=0

# 2. 从最近备份恢复（OSS 拉 dump）
gunzip < /tmp/mindlink-YYYYMMDD-HHMM.dump.gz | pg_restore -h $DB_HOST -U $DB_USERNAME -d mindlink_restore -c

# 3. 切流量到恢复库（修改 ConfigMap DB_DATABASE）
kubectl -n mindlink rollout restart deploy/mindlink-api
kubectl -n mindlink scale deploy/mindlink-api --replicas=2
```

## 回滚后

- [ ] 在飞书群发出 INCIDENT 收尾通告
- [ ] 24h 内开根因复盘会
- [ ] 写入 `docs/runbook/incidents.md` 案例库
- [ ] 给引入 bug 的 PR 加 `regression-from-prod` 标签
- [ ] 补单元/e2e 用例覆盖该场景

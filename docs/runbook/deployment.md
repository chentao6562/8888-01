# Runbook · 部署 SOP

## 0 · 适用范围

phase 8 K8s 集群部署。涵盖首次上线、版本升级、回滚。

## 1 · 前置准备

| 资源 | 来源 | 验证 |
|---|---|---|
| K8s 集群 | 腾讯云 TKE / 阿里云 ACK | `kubectl cluster-info` |
| 容器镜像仓库 | 腾讯云 TCR / 阿里云 ACR | `docker login $REGISTRY` |
| 域名 + 备案 | ICP 备案完成 | `dig api.mindlink.example.com` |
| TLS 证书 | cert-manager + Let's Encrypt | namespace 内有 ClusterIssuer |
| 数据库 | 云托管 PG 16 + Redis 7 | `psql -h <host>` |
| OSS bucket | 腾讯云 COS / 阿里云 OSS | `coscmd info` |
| 第三方密钥 | 微信 / 法大大 / 短信 / 大模型 | 全部配置在 K8s Secret |

## 2 · 首次上线

```bash
# 1. 创建 namespace + secret（不要 commit secret 文件）
kubectl create ns mindlink
kubectl -n mindlink create secret generic mindlink-api-secret \
  --from-literal=JWT_SECRET=$(openssl rand -hex 32) \
  --from-literal=ENCRYPTION_KEY=$(openssl rand -base64 32) \
  --from-literal=DB_USERNAME=mindlink \
  --from-literal=DB_PASSWORD=<pg pwd> \
  --from-literal=WECHAT_APP_ID=<wx appid> \
  ...

# 2. 部署基础设施（PG / Redis / Ingress）
kubectl apply -f infra/k8s/configmap.yaml
kubectl apply -f infra/k8s/redis.deployment.yaml
# 生产建议直接用云托管 PG，跳过 statefulset

# 3. 部署应用
bash infra/scripts/deploy-prod.sh v1.0.0

# 4. 配置 cron
kubectl apply -f infra/k8s/cronjobs.yaml
```

## 3 · 日常发布

1. PR merge 到 main → GitHub Actions 自动部署 staging
2. 在 staging 跑全量穿行 + 灰度账号回归
3. GitHub Actions → workflow_dispatch `Deploy Production` → 输入 `staging-<sha>` 镜像 tag + `I-KNOW-THIS-IS-PROD` 确认词
4. 部署完成后跑生产冒烟（health + 1 个真实账号登录）
5. 在飞书群发布发布通告

## 4 · 回滚

```bash
# 4.1 应急一行回滚
kubectl -n mindlink rollout undo deploy/mindlink-api

# 4.2 回到指定版本
kubectl -n mindlink set image deploy/mindlink-api api=$REGISTRY/mindlink/api:<old-tag>
kubectl -n mindlink rollout status deploy/mindlink-api --timeout=180s
```

完成后立刻在飞书发出 INCIDENT 通告 + 5 分钟内开根因排查会。

## 5 · 数据库迁移

phase 8 起 prod 用 TypeORM `migrationsRun: false`，手动迁移：

```bash
# 1. 在 staging 演练
pnpm --filter @mindlink/api typeorm migration:run

# 2. 生产前先备份
bash infra/scripts/db-backup.sh

# 3. 生产执行（在 K8s pod 内）
kubectl -n mindlink exec deploy/mindlink-api -- node dist/database/migrate.js
```

## 6 · 常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| 部署后 502 | api 启动失败 | `kubectl logs deploy/mindlink-api` 看 NestJS bootstrap 报错 |
| HPA 不扩容 | metrics-server 未装 | `kubectl top pod` 必须有数 |
| 登录返回 429 | 限流命中 | 检查 RateLimit 装饰器或 Ingress limit-rps |
| LLM 调用超时 | 大模型限流 / 网络 | 切换 backup provider · 临时把 `LLM_PROVIDER=mock` |

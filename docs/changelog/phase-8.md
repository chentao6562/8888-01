# Phase 8 · 集成测试 + Beta 部署 · 完工报告

**完工时间**：2026-04-21
**owner**：claude-opus-4-7

## 一句话

把所有 mock 留好真实 provider 切换位、给生产环境上加固带（AES 列加密 + 限流 + 安全头 + CORS 白名单 + audit 拦截器 + devLogin prod 守卫），交付完整的 Docker / K8s / CI 部署模板与 5 篇 runbook + 3 篇 onboarding，最后用穿行脚本 167/167 全绿验证。

---

## 范围澄清（Claude 可做 vs 待人工接手）

| 项 | 状态 |
|---|---|
| 代码层加固 + provider 抽象 + 模板 | ✅ 完成 |
| Docker / K8s / CI workflow 模板 | ✅ 完成 |
| Runbook + Onboarding + 法律文案 | ✅ 完成 |
| 真实云账号 + ICP 备案 + 域名 | ⏸ 运营接手 |
| 真实微信 / 法大大 / LLM key 注入 K8s Secret | ⏸ 运营接手 |
| 实际部署上线 + Beta 客户 onboarding | ⏸ 运营接手 |

---

## 代码层产出

### 安全加固

- **`EncryptionService`** · AES-256-GCM 列级加密 · `ENCRYPTION_KEY` 优先（base64 32B）/ `ENCRYPTION_PASSPHRASE` 兜底（scrypt 派生）· `maskPhone()` 工具
- **`RateLimitGuard`** · 装饰器 `@RateLimit({windowSec, max})` · 内存桶 + 周期清理 · 429 响应含 `Retry-After` 头与 `details.retryAfter`
- **`SecurityHeadersMiddleware`** · X-Content-Type-Options · X-Frame-Options · Referrer-Policy · Permissions-Policy · prod 加 HSTS
- **`AuditInterceptor`** · `@Audit('action.name')` 装饰 · 成功 / 失败均落库
- **CORS 白名单** · `CORS_ALLOWED_ORIGINS` env CSV · prod 严格 / dev 全开
- **devLogin prod 守卫** · `NODE_ENV=production && !ALLOW_DEV_LOGIN` → 403
- **trust proxy** · 生产环境 `app.set('trust proxy', 1)` 让 `req.ip` 取 X-Forwarded-For
- **Swagger 生产关闭** · 默认仅非生产或 `SWAGGER_ENABLED=1` 时挂 `/api/docs`

### 已应用 @Audit 的关键端点

- `auth.login` / `auth.register-tenant`（限流 + audit）
- `contract.send_for_signing`
- `contract.esign_callback`
- `payment.register`
- `client/auth/wechat-login` `bind-phone` `dev-login`（限流）

### Provider 抽象

- **`FadadaProvider`** stub · `EsignService.send()` 按 `ESIGN_PROVIDER=fadada` 路由 · 未实装路径显式抛错防止生产误用
- **WechatService** 已存在 mock/real 双模式（phase 7 落地）
- **LlmService** 已存在 mock/openai-compat 双模式（phase 4 落地）

### 限流策略

| 端点 | 窗口 | 上限 |
|---|---|---|
| `POST /auth/login` | 60s | 10 |
| `POST /auth/register-tenant` | 1h | 5 |
| `POST /client/auth/wechat-login` | 60s | 20 |
| `POST /client/auth/bind-phone` | 60s | 10 |
| `POST /client/auth/dev-login` | 60s | 10 |

---

## 基础设施模板

```
infra/
├── docker/
│   ├── api.Dockerfile           # 多阶段 · alpine + tini · 非 root · healthcheck
│   ├── admin-web.Dockerfile     # vite build → nginx 托管
│   └── nginx.conf               # gzip + SPA fallback + healthz + 安全头
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml           # 全部非密配置
│   ├── secret.template.yaml     # 模板 · 真值由 kubectl/云密管注入
│   ├── api.deployment.yaml      # 2 副本 + Service + HPA(CPU 70%)
│   ├── admin-web.deployment.yaml
│   ├── postgres.statefulset.yaml # Beta 自建 · 生产建议托管 PG
│   ├── redis.deployment.yaml
│   ├── ingress.yaml             # cert-manager + 限流注解
│   └── cronjobs.yaml            # 备份 / 续约扫描 / 月报推送
└── scripts/
    ├── deploy-staging.sh
    ├── deploy-prod.sh           # 交互式 confirm + 回滚提示
    └── db-backup.sh
```

### CI / CD

```
.github/workflows/
├── deploy-staging.yml   # push main → 自动跑 type-check + e2e + build + push + apply
└── deploy-prod.yml      # workflow_dispatch + 强制 confirm 字串 "I-KNOW-THIS-IS-PROD"
```

---

## 法律 + 合规

### 静态页

- `/privacy` · 7 节隐私政策（信息收集 / 使用 / 共享 / 加密 / 用户权利 / Cookie / 联系）
- `/terms` · 8 节用户协议（服务范围 / 账号 / 责任 / SLA / 计费 / 终止 / 免责 / 变更）

两页面均为 `meta.public: true`，无需登录即可访问。

---

## 文档产出

### Runbook（5 篇）

- [`deployment.md`](../runbook/deployment.md) · 首次上线 + 日常发布 + 回滚 + 数据库迁移 + 常见问题
- [`rollback.md`](../runbook/rollback.md) · 触发条件 + 决策流程 + 应用层 + 数据库回滚
- [`incidents.md`](../runbook/incidents.md) · P0-P3 严重级 + 标准响应 + 5 类常见故障预案 + 案例归档
- [`backup-restore.md`](../runbook/backup-restore.md) · 5 项备份策略 + 全量 / 时点恢复 + 季度演练清单
- [`scaling.md`](../runbook/scaling.md) · 容量基线 + 水平/垂直扩 + 慢查询优化 + 流量预估表

### Beta Onboarding（3 篇）

- [`admin-guide.md`](../beta-onboarding/admin-guide.md) · 5 分钟入门 + 主线 S1→S7 速查 + 角色权限矩阵 + FAQ
- [`client-guide.md`](../beta-onboarding/client-guide.md) · 一页图文 + 视频审核 60s + 月报 30s + 付款发票 + 续约
- [`faq.md`](../beta-onboarding/faq.md) · 6 大主题 30+ 问题汇总

---

## 验证

### 全量 e2e（`pnpm --filter @mindlink/api test:e2e`）

**97/97 passed** · 8 suites · 加固改动未引入回归。

### 全面穿行（`bash scripts/walkthrough.sh`）

**167/167 passed** · 耗时 93 秒 · 新增 L 段 9 断言：

- L.1 / L.1b / L.1c / L.1d 安全响应头四件套
- L.2 登录限流（连发 12 次错密命中 9 次 429）
- L.3 429 响应体含 `details.retryAfter`
- L.4 dev-login 在 dev 环境可用
- L.5 审计拦截器触发 `contract.send_for_signing.failed`（合同已 signed → 409，audit 仍记录）
- L.6 EncryptionModule 已注入

---

## 上线 checklist（运营接手时执行）

### 准备

- [ ] 注册微信小程序 + 提交订阅消息模板审批
- [ ] 开通法大大账号 + 创建 1 个合同模板
- [ ] 申请通义千问 / DeepSeek API key
- [ ] 阿里云 / 腾讯云账号 + ICP 备案域名
- [ ] 创建 K8s 集群（TKE 或 ACK）+ 容器镜像仓库
- [ ] 申请 OSS / COS bucket + 跨区复制
- [ ] 申请阿里云短信 / 腾讯云短信
- [ ] 申请 Sentry + Grafana Cloud 账号

### 部署

- [ ] `kubectl create ns mindlink`
- [ ] 用 `infra/k8s/secret.template.yaml` 填真值后 `kubectl apply`
- [ ] `kubectl apply -f infra/k8s/configmap.yaml`
- [ ] 部署数据库（建议托管 PG）+ Redis
- [ ] `bash infra/scripts/deploy-staging.sh v1.0.0-rc1`
- [ ] staging 跑 `bash scripts/walkthrough.sh`
- [ ] GitHub Actions 触发 `Deploy Production`
- [ ] 配置 cert-manager + Let's Encrypt
- [ ] 接入 Sentry DSN + Grafana 监控

### 灰度

- [ ] 1 家代运营公司在 staging 跑完整 S1→S7
- [ ] 1 个真实客户老板在 staging 完成视频审核 + 月报阅读 + NPS
- [ ] 灰度 prod 1 家 24h 无异常 → 放开 2 家
- [ ] 4 周内累计 3 家 Beta 客户上线

### 合规

- [ ] ICP 备案完成（域名底部展示）
- [ ] 隐私政策 + 用户协议律师 review 后定稿
- [ ] 小程序提审通过
- [ ] PIPL 自查 + 数据出境评估

---

## 已知遗留 / 推迟到 V2

| 项 | 当前 | V2 计划 |
|---|---|---|
| 数据自动采集 | 手动录入 | 接抖音 / 视频号开放平台 |
| 案例库官方运营 | 仅私库 | 思链团队运营官方爆款库 |
| 投放管理完整版 | 仅记账 | 计划 + 监测 + 归因 |
| AI 分镜可视化 | 无 | 文本 → 分镜板可视化 |
| 兼职市场 | 无 | 创作者 / 投手撮合平台 |
| 在线支付 | 无 | V3 接微信 / 支付宝 |
| 电子发票 | 仅申请 | V3 自动开票 |
| 多店切换 | 无 | V2 一个老板多店 |

---

## M3 里程碑

✅ **MVP 功能 8 段全部完工** · 8 个 phase 共 ~250 端点 · 总 e2e 97/97 + 总穿行 167/167

下一步是运营接手把基础设施跑起来，把 1-3 家 Beta 客户拉进来真实使用。本仓库的代码和文档已经备好接收。

---

_本文档归档于_：`docs/changelog/phase-8.md`
_对照_：`docs/changelog/mvp-release.md` 是面向外部的发布说明

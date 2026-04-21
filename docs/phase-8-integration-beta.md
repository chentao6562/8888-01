---
phase: 8
title: "集成测试 + Beta 部署"
duration: "1.5周"
status: done
owner: ""
blockers: []
depends-on: [0, 1, 2, 3, 4, 5, 6, 7]
produces:
  - infra/k8s/
  - infra/docker/
  - .github/workflows/deploy-staging.yml
  - .github/workflows/deploy-prod.yml
  - docs/runbook/*.md
  - docs/beta-onboarding/*.md
last-updated: "2026-04-21"
---

# 阶段 8 · 集成测试 + Beta 部署

## 0 · 一句话目标

> 把所有 mock 换成真实服务 → 端到端全链路跑通 → 腾讯云/阿里云 K8s 部署 → 1-3 家代运营公司 Beta 上线。

## 1 · 前置依赖

- phase 0-7 全部 `status: done`
- 所有 e2e 测试绿灯
- CC 已申请：
  - 微信小程序 AppId + 订阅消息模板
  - 电子签账号（法大大 或 e 签宝）
  - LLM 供应商账号
  - 腾讯云 / 阿里云账号
  - ICP 备案域名
- Beta 客户候选列表敲定（1-3 家）

## 2 · 范围

### 2.1 In-Scope

- **Mock 替换为真实服务**：
  - LLM：mock/备用 → 真实 provider（通义千问为主）
  - 电子签：`MockProvider` → `FadadaProvider`（或 `ESignBaoProvider`）
  - 微信登录 / 订阅消息：mock openid → 真实 code2Session
  - 短信：console.log → 真实短信（阿里云 / 腾讯云）
  - 对象存储：MinIO → 腾讯云 COS / 阿里云 OSS
- **安全加固**：
  - 敏感字段加密（手机 / 身份证 AES 列级加密）
  - OSS 签名 URL 防盗链（有效期 5 分钟）
  - API 限流真实生效
  - 安全头（Helmet）
  - CORS 白名单
  - SQL 注入 / XSS 二次 review
- **审计 + 监控**：
  - 审计日志覆盖所有关键动作
  - Prometheus + Grafana 指标采集
  - Sentry 前后端接入
  - 飞书/钉钉机器人告警
- **性能压测**：
  - 主要页面 API P95 < 500ms
  - 50 并发用户 10 分钟稳定
  - DB 慢查询 review
- **部署**：
  - Docker 多阶段构建（api / admin-web）
  - K8s manifests（或 Helm chart）
  - Ingress + HTTPS（Let's Encrypt 或云证书）
  - 数据库主从 + 备份策略（每日）
  - Redis 集群（或单点哨兵）
  - CI/CD：push 到 main → 自动部署预发
  - 手动触发生产发布
- **合规**：
  - ICP 备案完成
  - 个人信息保护法（PIPL）合规 review
  - 隐私政策 + 用户协议落页
  - 等保 2.0 初步（可选，视时间）
- **Beta onboarding**：
  - 准备培训手册（Web 管理端 + 客户端）
  - 首批 1-3 家租户建立 + 种子方法论
  - 反馈渠道（微信群 + 飞书表单）
- **端到端全链路测试**：
  - 1 个客户走完 S1 → S7 全链路
  - 故障演练：LLM 不可用 / 电子签超时 / 支付凭证丢失

### 2.2 Out-of-Scope

- 正式商用（MVP Beta 免费 3 月）
- V2 功能（兼职市场 / 自动发布 / 自动数据采集）
- 国际化 / 多语言
- 移动端独立 App

## 3 · 输出契约

### 3.1 新增文件清单

```
infra/
├── docker/
│   ├── api.Dockerfile
│   ├── admin-web.Dockerfile
│   └── nginx.Dockerfile
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.template.yaml
│   ├── api.deployment.yaml
│   ├── api.service.yaml
│   ├── admin-web.deployment.yaml
│   ├── admin-web.service.yaml
│   ├── postgres.statefulset.yaml
│   ├── redis.deployment.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   └── cronjobs.yaml                 // 替代 NestJS schedule（可选，生产推荐）
├── terraform/                        // 可选，腾讯云基础设施声明
│   └── main.tf
└── scripts/
    ├── deploy-staging.sh
    ├── deploy-prod.sh
    ├── db-backup.sh
    └── db-restore.sh

.github/workflows/
├── ci.yml                            // phase 0 已有
├── deploy-staging.yml
└── deploy-prod.yml                   // 手动触发

apps/api/src/
├── modules/esign/providers/
│   └── fadada.provider.ts            // 本 phase 实装
├── common/
│   ├── encryption/
│   │   └── encryption.service.ts     // AES 列级加密
│   ├── audit/
│   │   ├── audit.interceptor.ts      // 全局
│   │   └── audit.service.ts
│   └── rate-limit/
│       └── rate-limit.guard.ts

apps/admin-web/src/
└── services/sentry.ts

apps/client-mp/src/
└── services/sentry.ts

docs/
├── runbook/
│   ├── deployment.md
│   ├── rollback.md
│   ├── incidents.md
│   ├── backup-restore.md
│   └── scaling.md
├── beta-onboarding/
│   ├── admin-guide.md
│   ├── client-guide.md
│   └── faq.md
├── compliance/
│   ├── privacy-policy.md
│   ├── terms-of-service.md
│   └── pipl-review.md
└── changelog/
    └── mvp-release.md

.env.production.example
.env.staging.example
```

### 3.2 数据库变更

- 加密列迁移：`customers.boss_phone` / `customers.boss_wechat` / `users.phone` 改为加密列
- 索引审视：添加慢查询出来的缺失索引
- 备份策略写入文档（每日 02:30 全量 + 5 分钟增量 WAL）

### 3.3 对外 API

无新增端点。本 phase 重点是替换、加固、部署。

### 3.4 UI 页面

- 隐私政策页：`/privacy`（公开）
- 用户协议页：`/terms`（公开）
- 小程序对应法律声明入口

### 3.5 事件与任务

- K8s CronJob 取代 NestJS schedule（可选，更稳）
- 告警：P0 立即飞书推送 + 邮件

## 4 · 任务清单

### 替换 Mock

- [ ] **LLM**：切换 provider，调 prompt 回归通过
- [ ] **电子签**：实装 `FadadaProvider`
  - 创建模板对应
  - 发起签署 API
  - 回调签名校验
  - 回调幂等（同 orderId 多次回调只处理一次）
  - 签署完成后下载 PDF 存 OSS
- [ ] **微信**：
  - `code2Session` 真实账号
  - `getAccessToken` 调真实接口 + Redis 缓存（access_token 7200s）
  - `sendSubscribeMessage` 真实模板发送
  - 模板 ID 配置 env
- [ ] **短信**：
  - 阿里云短信 SDK 或腾讯云
  - 模板：登录验证码 / 邀请链接 / 付款提醒 / 月报推送降级
- [ ] **对象存储**：
  - COS/OSS Bucket 创建（含 CDN）
  - 签名 URL 逻辑迁移
  - 本地 MinIO 依然可用（开发）

### 安全加固

- [ ] AES-256 列级加密服务（key 从 KMS 读）
- [ ] 敏感字段 migration（保留明文列 → 加密列 → 删明文）
- [ ] 全量 OSS URL 改签名 URL（有效期 5 分钟）
- [ ] `@nestjs/throttler` 生效，限流阈值按 api-conventions §11
- [ ] Helmet 中间件
- [ ] CORS 白名单（staging + prod 域名）
- [ ] `bcrypt` cost 10 → prod 可改 12
- [ ] SQL 注入扫描工具跑一遍（sqlmap 基础扫描）
- [ ] XSS：前端 DOMPurify、后端输出 escape

### 审计 + 监控

- [ ] `AuditInterceptor`：全局拦截，关键 route 配 `@Audit('contract.sign')` 装饰器
- [ ] Prometheus `/metrics` 端点
- [ ] Grafana 面板：QPS / 延迟 / 错误率 / DB 连接池 / Redis / LLM 调用
- [ ] Sentry 前后端 DSN 接入
- [ ] 告警规则：
  - API 5xx > 1% 持续 5min
  - DB 连接池满
  - LLM 连续失败 > 10
  - 付款提醒任务失败

### 性能

- [ ] 压测脚本（k6 / Artillery）：主要接口
- [ ] 驾驶舱聚合加 Redis 缓存（key：`dashboard:{tenantId}:{date}`，ttl 5min）
- [ ] 客户列表加 keyset 分页（MVP 数据量不大，可不做）
- [ ] 慢查询日志开启 → 优化索引
- [ ] puppeteer PDF 生成迁移到独立 worker pod

### 部署

- [ ] Dockerfile 多阶段构建，镜像 < 300MB（api）/ < 50MB（admin-web Nginx 托管）
- [ ] K8s manifests：api 2 副本 + admin-web 2 副本 + pg 主从 + redis
- [ ] Ingress + TLS（cert-manager + Let's Encrypt，或云证书）
- [ ] HPA：api CPU 70%
- [ ] DB 备份 CronJob：每日 02:30 dump → OSS
- [ ] .env 管理：secret 放 K8s Secret / 云密管
- [ ] staging workflow：push main 自动部署
- [ ] prod workflow：手动触发 + 审批

### 合规

- [ ] ICP 备案完成（CC 处理）
- [ ] 隐私政策文案（律师 review，模板来自同行）
- [ ] 用户协议
- [ ] 小程序合规：用户信息授权弹窗、隐私协议入口
- [ ] PIPL 自查：数据出境（LLM 调用是否跨境）、用户撤回授权流程

### 端到端测试

- [ ] 1 个 fixture 客户完整跑 S1 → S7
- [ ] 故障演练 checklist：
  - LLM 全服务不可用 → 降级返回预置文案 + 错误提示
  - 电子签超时 → 合同回 draft + 通知
  - OSS 上传失败 → 前端重试 + 失败 toast
  - 数据库主库挂 → 从库只读
- [ ] Playwright 跨浏览器（Chrome + Edge）
- [ ] 真机测试（微信小程序至少 3 机型）

### Beta Onboarding

- [ ] 管理员培训手册（含截图 + 视频教程 ≥ 10 min）
- [ ] 客户端培训手册（一页图文）
- [ ] FAQ
- [ ] 创建 Beta 客户租户（手工 + 种子方法论导入）
- [ ] 飞书反馈群建立 + 反馈表单
- [ ] 每周固定反馈收集 + 迭代会

### Runbook

- [ ] `deployment.md`：部署步骤 + 回滚 + 常见问题
- [ ] `rollback.md`：失败回滚 SOP
- [ ] `incidents.md`：P0/P1/P2 响应时限
- [ ] `backup-restore.md`：备份与恢复演练
- [ ] `scaling.md`：扩容策略

## 5 · 数据模型

无新增业务实体。仅加密列迁移 + 审计日志扩展。

## 6 · 关键业务规则

- **SLA 目标**（MVP 指标）：
  - 可用性 ≥ 99.5%（月度）
  - 主要页面 P95 < 500ms
  - 月报生成成功率 ≥ 95%
  - 客户端崩溃率 < 0.5%
- **安全**：所有敏感字段加密 + 签名 URL + HTTPS 强制
- **备份**：每日全量 + 5 分钟 WAL，保留 30 天
- **发布**：staging 冒烟通过 → 手动升级 prod
- **Beta 免费期**：3 个月（PRD §12.1）

## 7 · 原型视觉约束

无新 UI，仅修复 Beta 反馈中视觉问题。

## 8 · 测试用例最低要求

- [ ] 完整 S1→S7 端到端（种子数据 → 脚本驱动一次过）
- [ ] 电子签真实回调幂等
- [ ] 微信订阅消息真实收到（开发机 + 至少 1 真实客户）
- [ ] AES 加密：DB 看是密文，API 返回是明文（权限内）
- [ ] 限流生效（60s 内 > 阈值 → 429）
- [ ] 压测 50 并发 10 分钟：无 5xx
- [ ] 备份恢复演练：dump → 新 PG → 数据一致
- [ ] LLM 全挂：API 返回友好 fallback，不 500

## 9 · 验收标准

- [ ] 所有 mock 已替换为真实实现
- [ ] Grafana 面板可看 10+ 关键指标
- [ ] 压测通过 + 故障演练通过
- [ ] 生产环境 URL 可访问 + HTTPS 有效
- [ ] 小程序提审通过（或正式上架）
- [ ] 1 家 beta 客户真实走完 S1→S7 全链路至少 1 轮
- [ ] 所有 runbook + onboarding 文档就绪
- [ ] CLAUDE.md 追加 M3 里程碑达成
- [ ] `docs/changelog/mvp-release.md` 完成

## 10 · 交接清单

本 phase 是 MVP 收官。无下游 phase。V2 由新文档继续。

### 下游（V2 启动）需要的：

- 本文件 "已知问题" 清单
- `docs/changelog/mvp-release.md` 完整发布记录
- Beta 反馈汇总（前 2 周 + 第 1 月）
- V2 优先级建议（基于反馈）

### 已知问题

- 数据采集仍手工 → V2 对接开放平台
- 案例库无官方库 → V2 建官方运营机制
- 投放管理仅记账 → V2 完整计划+监测+归因
- AI 分镜未做 → V2
- 兼职市场未做 → V2
- 在线支付未做 → V3
- 电子发票未做 → V3
- 多店切换未做 → V2

## 11 · 风险与开放问题

- [ ] 待确认：ICP 备案进度（CC 负责，必须在本 phase 开工前完成）
- [ ] 待确认：云账号预算（K8s + PG + Redis + OSS + CDN 月度预估 ¥2000-5000）
- [ ] 待决策：Beta 免费期满后的迁移路径（客户是否愿意付费？ 合同模板准备）
- [ ] 技术风险：puppeteer 在 K8s 内存峰值 —— 独立 pod 隔离
- [ ] 技术风险：微信小程序审核拒绝的常见雷区（金融 / 诱导分享 / 内容审核）—— 提前自查
- [ ] 业务风险：LLM 调用成本失控 —— 配额 + 监控双保险
- [ ] 合规风险：客户数据跨境流向 LLM —— 优先选国内 LLM（通义 / 文心 / DeepSeek）

---

## 附录 A · Beta 成功标准

MVP Beta 成功 = **3 个月内达成以下 3 条**：

1. 1-3 家 Beta 客户完整走完至少 1 轮 S1→S7 全流程
2. 客户端月活（客户老板端）≥ 80%（每家老板本月登录过小程序）
3. 至少 1 家 Beta 客户愿意付费续签（首批付费客户）

---

_文档版本_：1.0 · 2026-04-20

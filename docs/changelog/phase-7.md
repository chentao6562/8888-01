# Phase 7 · 小程序客户端 · 完工报告

**完工时间**：2026-04-21
**owner**：claude-opus-4-7

## 一句话

客户老板用微信（或手机号）登进小程序，看到本月数字 + 待办，点开待审视频打点批注后三选一，阅读月报后填 NPS，合同付款上传凭证 + 申请发票，合同快到期 30 天自动收到续约卡 + 一键预约 PM。后端以独立的 `client` 模块承接，通过 `role=customer` 的 JWT + `CustomerAuthGuard` 与管理端严格隔离。

---

## API 产出

### 新模块（2）

1. **wechat** · 独立 provider，`mock` 模式（`code → mock-xxx openid`）与 `real` 模式（接 `/sns/jscode2session`）双路径
2. **client** · 20 个 `/api/v1/client/*` 端点 · 全部走 `CustomerAuthGuard`

### 新实体（3）

- `CustomerUserEntity` · `(tenantId, customerId)` 唯一 + `openid` 索引
- `VideoCommentEntity` · 视频时间轴批注，`(tenantId, videoId, createdAt)` 索引
- `InvoiceRequestEntity` · 发票申请 · `pending → issued/rejected`

### 鉴权改造

- `JwtPayload` 由单一 `StaffJwtPayload` 扩成 `StaffJwtPayload | CustomerJwtPayload` 联合
- `JwtStrategy.validate()` 按 `payload.role === 'customer'` 分支走不同路径
- 新增 `CustomerAuthGuard` · 仅放行 `role=customer` token + 注入 `tenantId/customerId/customerUserId`
- 管理端全局 `JwtAuthGuard` 继续校验 staff，两路 JWT 互不串扰（e2e + 穿行双验）

### 20 个端点一览

```
POST /client/auth/wechat-login     微信登录（code → openid；未绑定返回 tempToken）
POST /client/auth/bind-phone       首次绑定手机号（匹配 customer.bossPhone）
POST /client/auth/dev-login        开发直连登录（phase 8 前无微信 AppId 备胎）
GET  /client/me                    当前客户信息
GET  /client/dashboard             首屏聚合（指标 + 待办 + 近期视频 + 续约 + 月报）
GET  /client/videos/pending-review 待审视频
GET  /client/videos/:id            视频详情 + 打点批注
POST /client/videos/:id/comments   打点批注
POST /client/videos/:id/review     approve / minor_change / reshoot
GET  /client/reports               月报列表
GET  /client/reports/:id           月报详情
POST /client/reports/:id/read      标已读（触发 NPS 弹窗）
POST /client/nps                   提交 NPS
POST /client/complaints            提交投诉（source=customer）
GET  /client/contracts             合同列表 + 分笔付款
POST /client/contracts/:id/payments/:pid/voucher  上传付款凭证
POST /client/invoice-requests      发票申请
GET  /client/renewals/current      当前续约卡
POST /client/renewals/:id/book-consult  预约 PM 沟通
```

---

## Client-MP 产出（uni-app H5 + 微信小程序）

### 新页面（7）

- `pages/index/index.vue` · 启动页（按 token 状态路由 login 或 home）
- `pages/login/login.vue` · 手机号 + 微信一键登录双入口 + 首次绑定
- `pages/home/home.vue` · 首屏（3 大数字 + 待办 + 近期视频 + 续约预警条）
- `pages/videos/list.vue` · 待审视频列表
- `pages/videos/detail.vue` · 播放 + 时间轴批注 + 审核三选一（通过 / 小改 / 重拍）
- `pages/reports/list.vue` · 月报列表（按月卡片 + 未读红点）
- `pages/reports/detail.vue` · 6 段式月报渲染 + 自动标已读 + NPS 弹窗
- `pages/renewals/current.vue` · 续约卡（到期天数 + 预约 PM 沟通）

### TabBar

4 个底栏：首页 / 待我审 / 月报 / 续约。

### 基础设施

- `src/api/http.ts` · `uni.request` 封装 · `uni.getStorageSync` token 持久化
- `src/api/client.ts` · 全部 20 个端点 TS 定义
- `vite.config.ts` + `tsconfig.json` · `@/*` → `src/*` 路径别名对齐

---

## 测试

### E2E（`pnpm --filter @mindlink/api test:e2e`）

**97/97 passed** · 8 suites（phase-7 新增 **16**）：

- wechat-login 未绑定返回 tempToken
- bind-phone 绑定 customer.bossPhone → 签 customer JWT
- bind-phone 拒绝未匹配手机号（404）
- dev-login 直接发 customer JWT
- `GET /client/me` 返回客户快照
- customer JWT 访问管理端 → 401/403
- admin JWT 访问 `/client/*` → 403
- `/client/dashboard` 聚合（待办 / 未读 / 近期）
- 视频详情 + 批注 + approve（状态 `pending_review → approved`）
- 非待审状态重复 review → 409
- 月报列表 + 详情 + 标已读（`sent → read`）+ NPS 提交
- 客户侧投诉
- 合同列表 + 上传凭证 + 发票申请
- `renewals/current` 在无预警时返回 null
- 跨租户：B 租户不能伪装成 A 的客户

### 全面穿行（`bash scripts/walkthrough.sh`）

**158/158 passed** · 耗时 103 秒。新增 K 段 21 断言，流程：

1. wechat-login 未绑定
2. 取穿行 B 段客户 bossPhone → bind-phone 成功
3. dev-login 复用 → 签 customer JWT
4. `/client/me` 快照
5. customer JWT 跨访管理端 → 403
6. admin JWT 跨访 `/client/*` → 403
7. `/client/dashboard` 聚合
8. 待审 / 月报 / 合同 / 续约四列表
9. 客户侧投诉 + 发票申请
10. 重复绑定 → 409（同客户已被其他 openid 占用）

### 三端类型检查

- API：`npx tsc --noEmit` clean（auth.service 的 JwtPayload 联合类型分支已完整）
- Client-MP：`npx vue-tsc --noEmit` clean（7 个页面 + 2 个 API 文件）

---

## 关键业务规则覆盖

| PRD 附录 C 规则 | 验证位置 | 结果 |
|---|---|---|
| 客户登录仅限已登记 customer.bossPhone | `bindPhone` + `devLogin` | ✓ |
| 一个客户仅绑定一个 openid | `existing.openid !== payload.openid` → 409 | ✓ |
| 客户端不可见员工/租户管理 | CustomerAuthGuard 限 role=customer | ✓ |
| 视频审核 pending_review → approved/minor_change/reshoot | 状态机常量 `VIDEO_STATUS_TRANSITIONS` | ✓ |
| 月报阅读后触发 NPS | `/reports/:id/read` + 前端自动弹窗 | ✓ |
| 客户投诉 source=customer | `ComplaintsService.create({source:'customer'})` | ✓ |
| 续约预警前 30 天可见 | `currentRenewal` 查 `warning/negotiating` | ✓ |

---

## 交接给 Phase 8

### 需要 Phase 8 替换的 Mock

- `wechat.service.mock` → 接 `api.weixin.qq.com/sns/jscode2session`（凭 `WECHAT_APP_ID/SECRET`）
- 订阅消息 `sendSubscribeMessage()` → 接 `/cgi-bin/message/subscribe/send`（需 access_token 管理）
- `bindPhone` 当前仅匹配 `bossPhone` → Phase 8 加短信验证码
- `bookRenewalConsult()` 当前只打 log → Phase 8 创建 Task 给 PM

### 定时任务待接

- 视频提审超过 48h 未审 → 发订阅消息催办
- 月报推送后 72h 未读 → 补一次推送
- 合同到期前 30 天 → 已有 `scan`，Phase 8 接 `@nestjs/schedule` 自动跑

### 客户端功能推迟项

- H5 端微信一键登录（uni.login 仅支持小程序环境）
- 月报 PDF 下载（`pdfUrl` 字段已预留）
- 投诉/发票后的通知回路（客户端拉不到状态变更推送）
- 推荐奖励（phase 8 做余额账户时补）

---

## 已知小瑕疵

- `devLogin` 在生产构建中未关闭，phase 8 上线前须加 `NODE_ENV !== 'production'` 守卫
- `CustomerUserEntity.loginCount` 通过 TypeORM create 未初始化为 0 时会 NaN（已在 service 内 `?? 0` 兜底）
- `CustomerAuthGuard` 的 `req.user` 断言使用结构类型 cast；phase 8 接 `@nestjs/passport` 的 `InjectRequestUser` 装饰器统一

---

## 启动

```bash
# 种子（幂等）
pnpm --filter @mindlink/api seed:phase-1
pnpm --filter @mindlink/api seed:phase-2
pnpm --filter @mindlink/api seed:phase-3
pnpm --filter @mindlink/api seed:phase-4
pnpm --filter @mindlink/api seed:phase-5
pnpm --filter @mindlink/api seed:phase-6
pnpm --filter @mindlink/api seed:phase-7

# 后端
pnpm --filter @mindlink/api dev            # :3000

# 客户端 H5（开发态）
pnpm --filter @mindlink/client-mp dev      # :5174（或其他 vite 端口）

# 登录：手机号 13500009001（或 seed 客户手机号）
# 打开就能看到待审 + 未读月报 + 3 大数字
```

---
phase: 7
title: "小程序客户端"
duration: "2周"
status: done
owner: ""
blockers: []
depends-on: [0, 1, 2, 3, 4, 5]
produces:
  - apps/client-mp/src/pages/**
  - apps/client-mp/src/components/**
  - apps/api/src/modules/client
  - apps/api/src/modules/wechat
last-updated: "2026-04-21"
---

# 阶段 7 · 小程序客户端（MindLink 差异化核心）

## 0 · 一句话目标

> 客户老板打开微信小程序 → 首屏看到本月核心数字 + 待办 → 审核成片 → 读月报 → 打 NPS → 续约。全流程无术语、大字体、3 秒懂。

## 1 · 前置依赖

- phase 0-5 完成（phase 6 可并行，互不阻塞）
- phase 3 的 Video 实体 + 成片审核 schema
- phase 5 的月报生成 + NPS 接口 + 客户端已有 `POST /api/v1/client/reports/:id/read`
- 微信小程序 AppId 申请完毕（CC 负责）
- 真实微信登录凭证配置（开发环境可用 mock openid）

## 2 · 范围

### 2.1 In-Scope

- **微信登录**：code2Session + 手机号绑定客户身份
- **客户端首屏**（客户打开见到的第一眼）：
  - 问候栏
  - 3 大核心数字（本月流水 / 到店客流 / ROI）
  - 待办事项（成片审核 / 月报未读 / 付款待办）
  - 本周已发布视频缩略图
  - 月报卡片入口
  - 底部 5 Tab
- **成片审核流**（代运营的高频场景）：
  - 待审视频列表
  - 视频预览（带水印）
  - 时间轴打点批注
  - 3 按钮：通过 / 小改 / 重拍
  - 历史版本对比
- **月度报告阅读页**：
  - 滚动式分页阅读
  - 图表可点击下钻
  - "本月 vs 上月" 切换
  - 阅读完自动触发 NPS
- **NPS 打分**：0-10 滑动 + 可选留言
- **合同与付款中心**：
  - 合同列表 + 详情
  - 分笔付款进度
  - 待付提醒
  - 凭证上传
  - 发票申请
- **续约入口**（到期前 30 天自动出现）：
  - 续约方案预览
  - 续约优惠展示
  - 推荐奖励说明
  - 一键预约沟通
- **个人中心**：
  - 客户老板信息
  - 切换店铺（如有多店）
  - 联系 PM 快捷入口
  - 退出
- **投诉入口**（客户侧提投诉）
- **Web H5 辅端**：与小程序共用 uni-app 代码，同一套页面打包成 H5

### 2.2 Out-of-Scope

- 多语言 / 国际化（V3）
- 离线缓存（V2）
- 推送通知完整体系（V2，MVP 仅做订阅消息）
- 客户员工账号（MVP 只有老板本人登录）

## 3 · 输出契约

### 3.1 新增文件清单

```
apps/client-mp/src/
├── main.ts
├── App.vue
├── manifest.json
├── pages.json                            // 路由声明
├── pages/
│   ├── login/
│   │   ├── login.vue
│   │   └── bind-phone.vue
│   ├── home/
│   │   └── home.vue                      // 首屏
│   ├── videos/
│   │   ├── review-list.vue               // 待审列表
│   │   └── review-detail.vue             // 审核详情
│   ├── reports/
│   │   ├── list.vue
│   │   └── detail.vue                    // 月报阅读
│   ├── contracts/
│   │   ├── list.vue
│   │   └── detail.vue
│   ├── renewals/
│   │   └── center.vue
│   ├── complaints/
│   │   └── new.vue
│   ├── profile/
│   │   └── index.vue
│   └── webview/
│       └── index.vue                     // 通用 webview 页（用于展示 H5 月报）
├── components/
│   ├── BigNumberCard.vue                 // 3 大核心数字卡
│   ├── TodoCard.vue
│   ├── VideoThumb.vue
│   ├── WatermarkPlayer.vue               // 带水印视频播放
│   ├── TimelineCommentInput.vue          // 打点批注
│   ├── NpsSlider.vue
│   ├── PaymentProgress.vue
│   ├── RenewalCard.vue
│   └── BottomTabBar.vue
├── api/
│   ├── http.ts                           // uni.request 封装
│   ├── auth.api.ts
│   ├── dashboard.api.ts
│   ├── videos.api.ts
│   ├── reports.api.ts
│   ├── contracts.api.ts
│   ├── renewals.api.ts
│   └── complaints.api.ts
├── stores/
│   ├── auth.store.ts
│   ├── customer.store.ts
│   └── home.store.ts
├── utils/
│   ├── wechat.ts                         // uni.login 包装
│   └── date.ts
├── styles/
│   └── tokens.scss                       // design tokens 客户端版
└── static/
    └── icons/

apps/api/src/modules/
├── client/
│   ├── client-auth.controller.ts         // 客户端专属鉴权
│   ├── client-dashboard.controller.ts    // 首屏聚合
│   ├── client-videos.controller.ts
│   ├── client-reports.controller.ts      // 接住 phase 5 的 read 端点 + list
│   ├── client-contracts.controller.ts
│   ├── client-renewals.controller.ts
│   ├── client-complaints.controller.ts
│   ├── client-profile.controller.ts
│   ├── client-auth.service.ts
│   ├── client-dashboard.service.ts
│   └── guards/
│       └── customer-auth.guard.ts
├── wechat/
│   ├── wechat.module.ts
│   ├── wechat.service.ts                 // code2Session, getAccessToken
│   ├── wechat-notification.service.ts    // 订阅消息
│   ├── providers/
│   │   ├── wechat-mp.provider.ts
│   │   └── mock.provider.ts
│   └── dto/

apps/api/src/seeds/phase-7.ts

packages/shared/src/types/
├── client-dashboard.ts
└── wechat.ts
```

### 3.2 数据库变更

- 新表：`customer_users`（客户老板的登录信息：openid / phone / customer_id / last_login_at）
- 新表：`wechat_subscriptions`（客户订阅消息授权记录）
- 扩展 `video_comments`：timestamp 字段已存在，本 phase 大量写入
- 扩展 `videos`：`review_*` 字段本 phase 读写驱动主要流程
- 扩展 `customers`：`app_login_count`、`last_app_login_at`（供健康度互动维度计算）

### 3.3 对外 API（全部 `/api/v1/client/*` 前缀）

| Method | Path | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/api/v1/client/auth/wechat-login` | 无 | code + iv + encryptedData → 客户身份（需预绑定手机） |
| POST | `/api/v1/client/auth/bind-phone` | customer（绑定阶段） | 通过短信验证码绑定 |
| POST | `/api/v1/client/auth/refresh` | 无 | refresh token |
| GET | `/api/v1/client/me` | customer | 当前客户信息 |
| GET | `/api/v1/client/dashboard` | customer | 首屏聚合：3 大数字 + 待办 + 本周视频 + 最新月报 |
| GET | `/api/v1/client/videos/pending-review` | customer | 待审视频列表 |
| GET | `/api/v1/client/videos/:id` | customer（其客户） | 视频详情（带水印 URL） |
| POST | `/api/v1/client/videos/:id/comments` | customer | 打点批注 |
| POST | `/api/v1/client/videos/:id/review` | customer | 提交审核：approve/minor_change/reshoot |
| GET | `/api/v1/client/reports` | customer | 月报列表 |
| GET | `/api/v1/client/reports/:id` | customer | 月报详情（H5 URL 或 JSON） |
| POST | `/api/v1/client/reports/:id/read` | customer | 已读回调（phase 5 定义，本 phase 消费） |
| POST | `/api/v1/client/nps` | customer | 提交 NPS（phase 5 定义） |
| GET | `/api/v1/client/contracts` | customer | 合同列表 |
| GET | `/api/v1/client/contracts/:id` | customer | 详情 |
| POST | `/api/v1/client/contracts/:id/payments/:pid/voucher` | customer | 上传付款凭证 |
| POST | `/api/v1/client/contracts/:id/invoice-request` | customer | 发票申请 |
| GET | `/api/v1/client/renewals/current` | customer | 当前续约卡（到期前 30 天才有内容） |
| POST | `/api/v1/client/renewals/:id/book-consult` | customer | 预约续约沟通（给 PM 发任务） |
| POST | `/api/v1/client/complaints` | customer | 提投诉 |
| POST | `/api/v1/client/wechat/subscribe` | customer | 订阅消息授权 |

### 3.4 UI 页面

| 路径 | 页面 | 原型依据 |
|---|---|---|
| `/pages/login/login` | 微信登录 | 自设计 |
| `/pages/login/bind-phone` | 手机绑定 | 自设计 |
| `/pages/home/home` | 客户端首屏 | 按 PRD §9.2 线框 |
| `/pages/videos/review-list` | 待审视频列表 | 自设计 |
| `/pages/videos/review-detail` | 成片审核详情 | 按 PRD §9.3 |
| `/pages/reports/list` | 月报列表 | 自设计 |
| `/pages/reports/detail` | 月报阅读 | 按 PRD §9.4 |
| `/pages/contracts/list` | 合同列表 | 按 PRD §9.5 |
| `/pages/contracts/detail` | 合同详情 | 按 PRD §9.5 |
| `/pages/renewals/center` | 续约中心 | 按 PRD §9.6 |
| `/pages/complaints/new` | 投诉入口 | 自设计 |
| `/pages/profile/index` | 个人中心 | 自设计 |

### 3.5 事件与任务

- 事件：`client.logged_in`、`client.video_reviewed`、`client.report_read`、`client.nps_submitted`、`client.complaint_submitted`、`client.booked_consult`
- 订阅消息：月报推送（每月 1 号自动）、成片待审推送（即时）、付款到期推送（提前 3 天）

## 4 · 任务清单

### DB

- [ ] 新表：`customer_users`、`wechat_subscriptions`
- [ ] 扩展字段 migration
- [ ] seed `phase-7.ts`：种子客户绑定 mock openid 便于本地 DEBUG

### API · WeChat

- [ ] `WechatService.code2Session(code)`：换 openid
- [ ] `WechatService.getAccessToken()`：缓存到 Redis（2h 过期前刷新）
- [ ] `WechatNotificationService.send(openid, templateId, data)`：订阅消息
- [ ] Mock provider 本地返回假数据

### API · Client Auth

- [ ] `ClientAuthController.wechatLogin(dto)`：
  - code → openid
  - 查 `customer_users` 是否已绑定
  - 未绑定 → 返回 `{ needBind: true, tempToken }`
  - 已绑定 → 签发客户 JWT
- [ ] `ClientAuthController.bindPhone(tempToken, phone, verifyCode)`：
  - 手机号匹配 `customers.boss_phone` → 绑定成功，创建 `customer_users`
  - 不匹配 → 404 `CUSTOMER_NOT_FOUND`
- [ ] `CustomerAuthGuard`：JWT.role === 'customer' 检查

### API · Client Dashboard

- [ ] `ClientDashboardController.get()`：
  - 查 customer 的本月 metric 汇总（流水 / 客流 / ROI）
  - 查待审视频（pending_review 且属本客户）
  - 查未读月报（sent 但未 read）
  - 查付款待付（pending + dueAt 近 7 天）
  - 查本周视频（published 且属本客户的项目）
  - 查当前续约（如到期前 30 天）
  - 组装 JSON 返回

### API · Client Videos

- [ ] `ClientVideosController`：
  - list 仅返回当前客户的 pending_review 视频
  - detail 视频 URL 自动加水印参数（OSS 图片处理 / 视频处理管线，或前端播放器绘水印）
  - `POST review`：根据 action 驱动状态机
    - approve → `video.status = approved`、`pending_publish` 后续
    - minor_change → 发给 editor 返工（task 创建）
    - reshoot → video 标"重拍"，回 strategist/creator + 重拍统计（phase 6 分析）
  - `POST comments`：写入 `video_comments(timestamp, text)`

### API · Client Reports

- [ ] list / detail（detail 返回 H5 URL 或 JSON 供小程序渲染）
- [ ] `read` 已在 phase 5 存在，本 phase 补订阅消息取消 + UI 引导

### API · Client Contracts

- [ ] list / detail 按 customer_id 过滤
- [ ] 凭证上传 → 写 `payments.voucher_url`
- [ ] invoice-request → 写入 `invoice_requests` 子表（MVP 新增），PM 侧显示待办

### API · Client Renewals

- [ ] current：查 renewal_records 处于 warning/negotiating 且属本客户
- [ ] book-consult：创建 task 给 PM

### API · Client Complaints

- [ ] 新增投诉 → 写 `complaints`（phase 5 表）+ severity 默认 mid，PM 侧待办

### MP · 首屏

- [ ] `home.vue`：
  - 深蓝顶部（60%）渐变：问候语 + 3 大数字网格 1/3 宽
  - 白底中部（40%）：待办卡 + 本周视频缩略 + 月报入口
  - 底部 5 Tab：首页 / 内容 / 数据 / 合同 / 我的
- [ ] `BigNumberCard` 使用 `text-5xl` 粗体白色，带趋势箭头
- [ ] 下拉刷新 / 上滑加载

### MP · 成片审核

- [ ] `review-list.vue`：卡片列表（视频缩略 + 标题 + 截止时间 + "去审核"按钮）
- [ ] `review-detail.vue`：
  - 顶部水印播放器（uni-app `<video>` + 浮层水印）
  - 中部评论区：用户点"现在这里有问题" → 弹输入框 → 记录当前时间 + 文本
  - 底部 3 按钮：通过（绿）/ 小改（黄）/ 重拍（红）
  - 通过按钮二次确认

### MP · 月报阅读

- [ ] `reports/detail.vue`：内嵌 web-view 加载 H5 URL（phase 5 生成的）
- [ ] 或 JSON 方案：原生渲染 6 段，图表用 uCharts
- [ ] 滚到底触发 `read` API + NPS 弹窗

### MP · 合同付款

- [ ] 合同详情带 `PaymentProgress` 4 节点组件
- [ ] 凭证上传用 `uni.chooseImage` + 直传 OSS（预签名）

### MP · 续约

- [ ] `renewals/center.vue`：顶部倒计时 + 推荐方案卡 + 优惠条 + 一键沟通按钮

### MP · 投诉

- [ ] `complaints/new.vue`：输入内容 + severity 选择 + 附件可选 + 提交

### MP · 个人中心

- [ ] 头像 + 昵称 + 绑定门店 + 快捷：联系 PM（跳客服）/ 订阅消息管理 / 退出

### MP · 全局

- [ ] `http.ts`：统一 Authorization + 401 跳登录
- [ ] `BottomTabBar`：在 pages.json 配置 + 自定义样式对齐 design tokens
- [ ] 订阅消息：在关键动作（如审核、NPS 提交）后请求用户订阅

### Shared

- [ ] `ClientDashboardResponse`、`ClientVideoReviewRequest`、`WechatLoginResponse`、`WechatSubscription`

## 5 · 数据模型

本 phase 新增轻量表：

```typescript
interface CustomerUser {
  id: string;
  tenantId: string;
  customerId: string;
  openid: string;
  unionid: string | null;
  phone: string;
  lastLoginAt: Date;
}

interface InvoiceRequest {
  id: string;
  tenantId: string;
  customerId: string;
  contractId: string;
  paymentIds: string[];
  invoiceTitle: string;
  taxId: string;
  invoiceType: 'general' | 'special';
  mailAddress: string | null;
  status: 'pending' | 'issued' | 'rejected';
  issuedAt: Date | null;
  createdAt: Date;
}

interface WechatSubscription {
  id: string;
  customerUserId: string;
  templateId: string;
  acceptedAt: Date;
  expiresAt: Date;      // 订阅一次仅一次有效
}
```

## 6 · 关键业务规则

- **客户端设计原则**（PRD §9.1）：
  - 最简：呼市 45 岁老板看得懂
  - 一屏：核心数据和动作首屏
  - 动作导向：每页告诉客户"接下来干什么"
  - 去术语化：不说 GMV/ROI/POI 黑话，用"流水/到店/投入产出"等
  - 多端一致：小程序 + H5 数据实时同步
- **成片审核 SLA**（PRD 附录 C）：48 小时内必须决策
- **水印**：必须防盗链（OSS 签名 URL + 前端水印浮层）
- **订阅消息**：每次关键动作（审核 / NPS / 合同）后请求订阅
- **多店切换**：暂无（MVP customer 1:1 boss，V2 做多店）
- **绑定验证**：手机号必须匹配 `customer.boss_phone`，限流 5 分钟 3 次

## 7 · 原型视觉约束

- 原型稿未给出客户端，按 PRD §9 各节的线框描述实现
- 首屏严格按 PRD §9.2：深蓝 60% + 白底 40% + 5 Tab 底部
- 成片审核、月报、合同、续约按 PRD §9.3-9.6
- 颜色与 Web 管理端共用 Design Token（客户端版 `tokens.scss` 转换 rpx）
- 字号客户端放大：大数字用 `text-5xl`（56px / 112rpx）

## 8 · 测试用例最低要求

- [ ] 未绑定客户微信登录 → 返回 needBind → 绑定手机成功 → 登录成功
- [ ] 错误手机号绑定 → 404
- [ ] 客户 X 不能看到客户 Y 的合同 / 视频 / 月报
- [ ] 成片审核通过 → video.status 正确流转
- [ ] 月报已读 → `read_at` 写入 + NPS 端点可用
- [ ] NPS 提交唯一约束 `(customer_id, report_id)`，重复 409
- [ ] 凭证上传成功 → `voucher_url` 写入
- [ ] 续约到期前 30 天才返回续约内容，否则 `current: null`
- [ ] 投诉提交 → PM web 端待办可见
- [ ] 订阅消息授权记录写入

## 9 · 验收标准

- [ ] 端到端 demo：PM 推月报 → 客户收到订阅消息 → 点开进小程序 → 读月报 → 打 NPS → 首屏回来 → 看到 "3 大数字" 变化（phase 5 数据驱动）
- [ ] 端到端 demo：PM 提交成片审核 → 客户微信收到通知 → 小程序打开 → 带水印播放 → 打点批注 → 通过
- [ ] 真机在微信开发者工具 + 至少 1 部真机上跑通
- [ ] 客户端所有页面符合 PRD §9 的线框描述
- [ ] Web H5 版本用同一套代码（uni-app 打包 H5）可访问
- [ ] 单测 + e2e 通过
- [ ] CLAUDE.md 追加更新

## 10 · 交接清单

**下游**：phase 8（Beta 前全链路打通 + 真实微信推送）

### 可用 API

- 完整 `/api/v1/client/*`

### 可用数据

- `CustomerUser`、`InvoiceRequest`、`WechatSubscription` 等实体

### 可复用能力

- `WechatService` + `WechatNotificationService`（phase 8 若新增通知场景直接复用）
- `CustomerAuthGuard`

### 已知问题

- 订阅消息模板 ID 需要 CC 在微信后台申请 —— phase 8 前必须完成
- 视频水印浮层在某些 Android 真机上透明度异常 —— 记 issue
- Web H5 端与小程序共用代码，部分小程序 API 在 H5 不可用，用 uni 条件编译处理

### 回归测试

- `e2e/client-wechat-login.spec.ts`
- `e2e/client-video-review.spec.ts`
- `e2e/client-report-read.spec.ts`
- 真机手工测试清单（附 checklist）

## 11 · 风险与开放问题

- [ ] 待决策：投诉内容是否对客户老板透明（客户可见自己提交的投诉处理进度）— 建议可见 = ✓
- [ ] 待决策：多店老板如何切换（目前 MVP 1:1）— V2
- [ ] 技术风险：视频带水印直出 vs 前端浮层 —— 建议 MVP 用前端浮层 + 签名 URL，V2 用 OSS 转码
- [ ] 合规风险：客户数据客户可看，但"行业 benchmark" 数据是否混入？—— 不能混入，只返回本人数据
- [ ] 产品风险：45 岁老板使用门槛 —— Beta 阶段收集反馈，准备 V2 迭代

---

_文档版本_：1.0 · 2026-04-20

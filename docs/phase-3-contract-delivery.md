---
phase: 3
title: "S4-S5 合同 · 启动会 · 项目 · 任务"
duration: "2周"
status: done
owner: "claude-opus-4-7"
blockers: []
depends-on: [0, 1, 2]
produces:
  - apps/api/src/modules/contracts
  - apps/api/src/modules/projects
  - apps/api/src/modules/tasks
  - apps/api/src/modules/videos
  - apps/api/src/modules/kickoff
  - apps/api/src/modules/esign
  - apps/admin-web/src/views/contracts
  - apps/admin-web/src/views/projects
  - apps/admin-web/src/views/tasks
  - apps/admin-web/src/views/videos
last-updated: "2026-04-20"
---

# 阶段 3 · S4-S5 · 合同 · 启动会 · 项目 · 任务

## 0 · 一句话目标

> 签了定位书的客户 → 生成合同 → 电子签（mock） → 召开启动会 → 项目启动 → 任务分发到各角色的"我的任务"。

## 1 · 前置依赖

- phase 0、1、2 完成
- `Customer.stage=signed` 状态可达（phase 2 已开放）
- `PositioningBook.signedAt` 有值时可生成合同
- `OwnershipGuard` 可用
- MinIO / OSS 已跑通（合同 PDF 存储）

## 2 · 范围

### 2.1 In-Scope

- **合同模块**：
  - 合同模板库（每套餐 1-2 模板，变量字段）
  - 合同创建（基于 Proposal 快照）
  - 电子签对接抽象（接口 mock，phase 8 换真实）
  - "先拍后付" 四笔付款登记（20/40/35/5）
  - 付款到期提醒
  - 付款凭证上传
- **启动会工具**：
  - 议程模板（目标对齐 / 角色分工 / 排期 / 风险 / 沟通机制）
  - 结构化纪要 → PDF
  - 纪要中的任务自动同步到项目看板
- **项目模块**：
  - Project 实体（合同签署 + 启动会完成后创建）
  - 项目看板（按 Video 状态：策划/拍摄/剪辑/发布）
  - 项目甘特图
  - 项目月度目标 KPI（goals）
- **任务模块**：
  - Task 实体（含 assignee / dueAt / status）
  - "我的任务"页（全角色通用）
  - 超时预警（负责人 → PM → 管理员 三级升级）
  - 任务流转记录
- **Video 实体最小化**：
  - 本 phase 引入 Video 实体（承载从策划到发布的流转）
  - 基础状态机（planning → shooting → editing → pending_review → approved → pending_publish → published）
  - 仅建 CRUD 与状态机，成片审核 UI 归 phase 7（小程序）

### 2.2 Out-of-Scope

- 真实电子签（phase 8 换接入）
- AI 辅助文案/标题/标签（phase 4）
- 多平台发布（V2，MVP 只做 publish 状态标记）
- 数据采集（phase 5 手工录入）
- 兼职市场（V2）

## 3 · 输出契约

### 3.1 新增文件清单

```
apps/api/src/modules/
├── contracts/
│   ├── contracts.controller.ts
│   ├── contracts.service.ts
│   ├── contracts.module.ts
│   ├── entities/{contract,payment,contract-template}.entity.ts
│   ├── dto/{create,update,list,pay,template}.dto.ts
│   └── pdf/contract-pdf.service.ts      // puppeteer 生成
├── esign/
│   ├── esign.module.ts
│   ├── esign.service.ts                 // 抽象层
│   ├── providers/
│   │   ├── mock.provider.ts             // 本 phase 用
│   │   └── fadada.provider.ts           // phase 8 实装
│   └── dto/{send,callback}.dto.ts
├── kickoff/
│   ├── kickoff.controller.ts
│   ├── kickoff.service.ts
│   ├── kickoff.module.ts
│   ├── entities/kickoff-meeting.entity.ts
│   └── dto/{create,update,finalize}.dto.ts
├── projects/
│   ├── projects.controller.ts
│   ├── projects.service.ts
│   ├── projects.module.ts
│   ├── entities/{project,project-goal}.entity.ts
│   └── dto/{create,update,list,add-goal}.dto.ts
├── tasks/
│   ├── tasks.controller.ts
│   ├── tasks.service.ts
│   ├── tasks.module.ts
│   ├── entities/task.entity.ts
│   └── dto/{create,update,list,transition}.dto.ts
├── videos/
│   ├── videos.controller.ts
│   ├── videos.service.ts
│   ├── videos.module.ts
│   ├── entities/{video,video-comment,publish-plan}.entity.ts
│   └── dto/{create,update,list,transition,review}.dto.ts

apps/api/src/common/scheduled-tasks/
├── payment-reminder.task.ts              // 每天 09:00 扫付款到期
└── task-escalation.task.ts               // 每小时扫任务超时

apps/api/src/migrations/
├── 0009-contract-templates.ts
├── 0010-contracts.ts
├── 0011-payments.ts
├── 0012-projects.ts
├── 0013-kickoff-meetings.ts
├── 0014-tasks.ts
└── 0015-videos.ts

apps/api/src/seeds/phase-3.ts

apps/admin-web/src/views/
├── contracts/
│   ├── ContractListView.vue             // 按状态分组 tabs
│   ├── ContractDetailView.vue
│   ├── ContractEditorView.vue
│   └── components/PaymentTimeline.vue
├── projects/
│   ├── ProjectListView.vue
│   ├── ProjectBoardView.vue             // 8 状态列看板
│   ├── ProjectGanttView.vue
│   └── ProjectDetailView.vue
├── tasks/
│   ├── MyTasksView.vue                  // 全角色通用
│   └── components/TaskItem.vue
├── videos/
│   ├── VideoListView.vue
│   └── VideoDetailView.vue              // 成片流转管理
└── kickoff/
    └── KickoffMeetingModal.vue          // 在项目详情页触发

apps/admin-web/src/stores/
├── contracts.store.ts
├── projects.store.ts
├── tasks.store.ts
└── videos.store.ts

packages/shared/src/types/
├── contract.ts
├── project.ts
├── task.ts
└── video.ts
```

### 3.2 数据库变更

- 新表：`contract_templates`（每租户私有 + 官方库公共）
- 新表：`contracts`
- 新表：`payments`（1 合同 N 支付记录）
- 新表：`projects`
- 新表：`project_goals`（1 项目 N 月目标）
- 新表：`kickoff_meetings`
- 新表：`tasks`
- 新表：`videos`
- 新表：`video_comments`（审核批注，phase 7 用）
- 新表：`publish_plans`
- 扩展 `customers`：无新字段，但状态机允许走到 `delivering`

### 3.3 对外 API

**合同**

| Method | Path | Roles | 说明 |
|---|---|---|---|
| GET | `/api/v1/contract-templates` | admin/pm/strategist | 模板列表 |
| POST | `/api/v1/contract-templates` | admin | 新建模板 |
| GET | `/api/v1/contracts` | admin/pm | 合同列表 |
| POST | `/api/v1/contracts` | pm/admin | 基于 proposal 创建合同 |
| GET | `/api/v1/contracts/:id` | owner/admin | 详情 |
| PATCH | `/api/v1/contracts/:id` | owner/admin | 编辑（仅 draft 态） |
| POST | `/api/v1/contracts/:id/send-for-signing` | pm/admin | 提交电子签 |
| POST | `/api/v1/contracts/:id/esign-callback` | 无（签名验证） | 电子签回调 |
| POST | `/api/v1/contracts/:id/payments/:paymentId/register` | pm/admin | 登记付款 |
| POST | `/api/v1/contracts/:id/payments/:paymentId/voucher` | pm/admin/customer | 上传凭证 |

**项目 / 启动会**

| Method | Path | Roles | 说明 |
|---|---|---|---|
| POST | `/api/v1/projects` | pm/admin | 基于合同创建项目 |
| GET | `/api/v1/projects` | admin/pm/strategist | 列表 |
| GET | `/api/v1/projects/:id` | owner/admin/pm | 详情 |
| POST | `/api/v1/projects/:id/goals` | pm | 设置月度目标 |
| POST | `/api/v1/projects/:id/kickoff` | pm | 新建启动会 |
| PATCH | `/api/v1/kickoff/:id` | pm | 编辑纪要 |
| POST | `/api/v1/kickoff/:id/finalize` | pm | 纪要定稿 → 生成 PDF + 同步任务 |

**任务**

| Method | Path | Roles | 说明 |
|---|---|---|---|
| GET | `/api/v1/tasks` | any authed | 任务列表（含筛选 assigneeId） |
| GET | `/api/v1/tasks/mine` | any authed | 我的任务 |
| POST | `/api/v1/tasks` | pm/admin | 新建任务 |
| PATCH | `/api/v1/tasks/:id` | owner/pm/admin | 改 |
| POST | `/api/v1/tasks/:id/transition` | owner/pm | 状态跳转 |

**视频**

| Method | Path | Roles | 说明 |
|---|---|---|---|
| GET | `/api/v1/videos` | admin/pm/strategist/creator | 列表 |
| POST | `/api/v1/videos` | strategist/pm | 策划新建 |
| PATCH | `/api/v1/videos/:id` | owner | 编辑字段 |
| POST | `/api/v1/videos/:id/transition` | owner | 状态跳转（planning → shooting → ...） |
| POST | `/api/v1/videos/:id/upload-raw` | creator | 原始素材上传（复用 uploads） |
| POST | `/api/v1/videos/:id/upload-final` | creator | 终片上传 |
| POST | `/api/v1/videos/:id/submit-for-review` | pm | 提交客户审核（不发通知，phase 7 做） |

### 3.4 UI 页面

| 路由 | 页面 | 可见角色 | 备注 |
|---|---|---|---|
| `/contracts` | 合同列表 | admin/pm | 按 draft/pending_sign/signed/executing/completed 分 tab |
| `/contracts/:id` | 合同详情 | owner/admin | 含付款时间轴组件 |
| `/projects` | 项目列表 | admin/pm/strategist | 卡片/列表切换 |
| `/projects/:id` | 项目详情 | owner/admin/pm | tabs: 看板 / 甘特 / 视频 / 任务 / 启动会 |
| `/tasks/mine` | 我的任务 | any authed | 侧栏固定入口 |
| `/videos` | 视频列表 | admin/pm/strategist/creator | 支持按项目/状态筛选 |
| `/videos/:id` | 视频详情 | owner/pm | 文件 + 文案 + 状态流转 |

### 3.5 事件与任务

- 定时：`0 9 * * *` 付款到期前 3 天提醒（客户 + PM）
- 定时：`0 */1 * * *` 任务超时扫描 + 三级升级
- 事件：`contract.created`、`contract.signed`、`payment.registered`、`project.started`、`kickoff.finalized`、`task.created`、`task.assigned`、`task.overdue`、`video.status_changed`

## 4 · 任务清单

### DB

- [ ] migrations 0009-0015
- [ ] 外键约束完整
- [ ] 索引见 data-model §5
- [ ] 种子 `phase-3.ts`：每租户 1 合同（已签）+ 1 项目（running）+ 5 任务 + 3 视频各种状态

### API · Contracts

- [ ] 基于 Proposal 创建 Contract（拷贝快照，proposal 变更不影响合同）
- [ ] `ContractPdfService.generate()` puppeteer 渲染含 logo 的合同 PDF
- [ ] 自动拆 4 笔付款（按 PRD 附录 C：20/40/35/5），dueAt 由 PM 填
- [ ] 电子签抽象层：`EsignProvider` 接口 + `MockProvider`（直接把合同标记 signed）
- [ ] 回调端点：校验签名（mock 也要有）
- [ ] Payment 登记：幂等（`Idempotency-Key`）、金额校验、凭证上传

### API · Projects / Kickoff

- [ ] `Project` 创建前验证 Contract.status === 'signed'
- [ ] `KickoffMeeting` 创建 → 编辑 → finalize：finalize 时调用 `TasksService.createFromKickoff(kickoff)` 同步任务
- [ ] `KickoffPdfService` 生成纪要 PDF
- [ ] Project 状态自动：kickoff.finalize 后 → `project.status='running'`、`customer.stage='delivering'`

### API · Tasks

- [ ] `TasksService` CRUD + `transition(id, to)` 含状态机校验
- [ ] `TaskEscalationTask`：每小时扫 `status in (pending, in_progress) AND due_at < now`：
  - 第一次超时 → 通知 assignee + 标 `overdue`
  - 超时 24h → 通知 PM
  - 超时 72h → 通知 admin
- [ ] `GET /tasks/mine` 按当前 staffId 过滤

### API · Videos

- [ ] `VideosService` + CRUD + `transition`
- [ ] 状态机约束严格（见 data-model §2.6）
- [ ] `upload-raw` / `upload-final` 基于 `uploads` 模块，存入 `raw_material_urls[]` / `final_video_url`
- [ ] `submit-for-review`：video.status = `pending_review`，写入 customer 的待审视频池（phase 7 拉取）

### Admin Web · Contracts

- [ ] 合同列表按状态 tabs + 每行摘要（客户名、合同号、总额、已付/待付、下一笔到期）
- [ ] 合同详情三列：基础信息 · 付款时间轴 · 文件列表（模板 PDF / 已签 PDF / 凭证）
- [ ] `PaymentTimeline` 组件：4 点进度条 + 每点状态（待付/已付/逾期）
- [ ] 创建合同向导：选客户 → 选方案 → 选模板 → 变量填充 → 预览 → 提交签署
- [ ] 模板管理页（admin 可见）

### Admin Web · Projects

- [ ] `ProjectListView`：卡片（项目名、客户、PM、进度%、本月 KPI 完成%）
- [ ] `ProjectBoardView`：8 列看板（拖拽触发 video.transition）
- [ ] `ProjectGanttView`：横轴时间、纵轴视频，块体显示状态
- [ ] `ProjectDetailView`：tabs 承载看板/甘特/视频/任务/启动会
- [ ] `KickoffMeetingModal`：议程 5 节结构化表单

### Admin Web · Tasks

- [ ] `MyTasksView`：四分区（今日 / 本周 / 已逾期 / 已完成）
- [ ] `TaskItem` 组件：标题 + 项目 + dueAt + 状态芯片 + 快捷"开始/完成"按钮
- [ ] 任务超时红色徽章

### Admin Web · Videos

- [ ] `VideoListView`：列表（项目、策划、标题、状态、更新时间）
- [ ] `VideoDetailView`：
  - 左：视频预览（若有）+ 元信息
  - 右 tabs：文案 / 素材 / 流转记录 / 审核（phase 7 激活）

### Shared

- [ ] `Contract`、`Payment`、`ContractTemplate`
- [ ] `Project`、`ProjectGoal`、`KickoffMeeting`
- [ ] `Task`
- [ ] `Video`、`VideoStatus`、`PublishPlan`
- [ ] `contract-status-transitions.ts` 合法跳转表
- [ ] `video-status-transitions.ts` 合法跳转表
- [ ] `task-status-transitions.ts` 合法跳转表

## 5 · 数据模型

详见 [data-model.md](./shared/data-model.md) §2.4 Project、§2.5 Contract、§2.6 Video、§2.8 Task、§3.6 KickoffMeeting。

### 状态机合法跳转

Contract: `draft → pending_sign → signed → executing → completed/terminated → renewed`
Project: `kickoff → running → at_risk ↔ running → completed/aborted`
Video: `planning → shooting → editing → pending_review → approved → pending_publish → published → offline`
Task: `pending → in_progress → pending_review → done` · 异常分支：`rework` / `overdue`

## 6 · 关键业务规则

- **分笔付款比例**：20/40/35/5（PRD 附录 C，写常量 `PAYMENT_RATIOS`）
- **付款提醒**：到期前 3 天 09:00 推（客户 + PM）；逾期后每天推直到完成
- **成片审核 SLA**：48 小时（phase 7 逻辑，本 phase 记录 `pending_review_at`）
- **任务超时升级**：本人 → 24h → PM → 72h → admin
- **启动会 finalize 不可再编辑**：只能追加新启动会（项目每期只能有一次正式）
- **合同 signed 后禁止编辑正文**：仅可补付款记录和上传凭证
- **Video 与 Project 的归属**：Video 必须关联 Project，Project 删除阻断（先删 video）
- **customer.stage 联动**：
  - 合同 signed + project 创建 → `signed`
  - kickoff.finalized → `delivering`

## 7 · 原型视觉约束

- 原型未覆盖本 phase 页面，所有页面按 `docs/shared/design-tokens.md` 自行扩展
- 表格风格一致 02_customers.html
- 卡片风格一致 03_customer_detail.html
- 看板列颜色对应 video.status 语义色

## 8 · 测试用例最低要求

- [ ] 从 signed proposal 创建合同 → mock 电子签 → 状态变 signed
- [ ] Contract 非 draft 态尝试编辑 → 409
- [ ] Payment 重复登记（同 Idempotency-Key） → 仅一条记录
- [ ] 创建 project 时 contract 未 signed → 422
- [ ] Kickoff finalize → 自动生成 3+ tasks → 对应人在 `/tasks/mine` 看到
- [ ] Task 超时 → `overdue` 字段置位 → 通知发出（可在 audit_logs 验证）
- [ ] Video 状态非法跳转（planning → published）→ 409
- [ ] 租户隔离：A 不能看到 B 的合同、项目、任务、视频（4 表）
- [ ] PM 不能删除 admin 创建的合同模板

## 9 · 验收标准

- [ ] 完整 demo：签字定位书 → 合同生成 → 电子签 mock → 付款 1 笔 → 创建项目 → 启动会 → 5 任务派发
- [ ] 4 状态机（Contract/Project/Video/Task）e2e 覆盖所有合法跳转 + 至少 3 种非法跳转
- [ ] 任务超时三级升级本地可触发（调时钟 / 手动调 API）
- [ ] 项目看板拖拽驱动 Video.transition 生效
- [ ] 甘特图渲染正常（至少 5 视频 × 4 周）
- [ ] 所有新端点 Swagger 齐全
- [ ] 单测 ≥ 70%
- [ ] CLAUDE.md 追加更新

## 10 · 交接清单（Handoff to Phase 4 和 Phase 5）

### 可用 API

- `/api/v1/contracts/*`（完整）
- `/api/v1/projects/*`、`/api/v1/kickoff/*`
- `/api/v1/tasks/*`、`/api/v1/tasks/mine`
- `/api/v1/videos/*`（供 phase 4 AI 文案填充 · phase 5 填 metrics · phase 7 成片审核）

### 可用数据

- 完整 Contract/Project/Task/Video 关系图
- 种子：每租户 1 项目 + 5 任务 + 3 视频各状态

### 可复用组件

- `<PaymentTimeline>` 4 笔付款进度条
- `<TaskItem>` 任务卡
- `<VideoStatusBadge>` 视频状态
- `<GanttChart>`（项目甘特，phase 5 / 7 可复用）
- `EsignProvider` 接口（phase 8 换 fadada/esign.bao 实现）

### 已知问题

- Mock 电子签直接把状态改 signed，无法验证回调时序 —— phase 8 必须接真实并加回调幂等测试
- 任务超时升级通知只打 console —— phase 8 接入真实短信/微信
- 项目甘特图 v1 用 `vis-timeline`，移动端体验一般 —— V2 优化

### 回归测试

- `e2e/contract-flow.spec.ts`
- `e2e/project-kickoff.spec.ts`
- `e2e/task-lifecycle.spec.ts`
- `e2e/video-state-machine.spec.ts`

## 11 · 风险与开放问题

- [ ] 待决策：合同模板是否支持租户自定义修改（目前 admin 可创建 / 编辑本租户模板）？— 当前支持
- [ ] 待决策：付款凭证上传方（客户 or PM）？— 当前两方都可，凭证所属记录 uploaderId
- [ ] 技术风险：Puppeteer PDF 在 K8s 内存消耗 —— phase 8 切换到独立 worker pod
- [ ] 业务风险：先拍后付的付款节奏与创作者任务款释放的联动 —— V2 兼职市场时统一处理

---

_文档版本_：1.0 · 2026-04-20

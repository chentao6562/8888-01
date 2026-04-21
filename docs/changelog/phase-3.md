# Phase 3 · 合同 · 启动会 · 项目 · 任务 · 视频 · 完工报告

**完工时间**：2026-04-20
**owner**：claude-opus-4-7

## 一句话

从"签字定位书"到"项目启动、任务下派、视频进入剪辑"的 S4-S5 全链路打通。4 个状态机（Contract / Project / Task / Video）严格守住流转。电子签用 Mock provider（phase 8 换真实）。

---

## API 产出

### 新模块（6）

- `contracts/` · 合同 + 合同模板 + 付款（4 笔 20/40/35/5）
- `esign/` · 电子签抽象层（Mock provider）
- `projects/` · 项目（kickoff/running/at_risk/completed/aborted）
- `projects/kickoffs` · 启动会（5 节议程 + 初始任务批量派发）
- `tasks/` · 任务（6 状态 + my-tasks + overdue 扫描）
- `videos/` · 视频（10 状态 · 素材 · 文案 · 审核 hook）

### 新增实体（7）

- `ContractEntity` · `ContractTemplateEntity` · `PaymentEntity`
- `ProjectEntity` · `KickoffMeetingEntity`
- `TaskEntity`
- `VideoEntity`

### 新增端点（约 30）

**合同 / 付款**
- `GET /contract-templates`
- `POST /contract-templates`
- `GET /contracts?status=...`
- `POST /contracts`（基于 proposalId，自动拆 4 笔付款）
- `GET /contracts/:id`
- `PATCH /contracts/:id`（仅 draft 可改）
- `GET /contracts/:id/payments`
- `POST /contracts/:id/send-for-signing`（→ pending_sign）
- `POST /contracts/:id/esign-callback`（public · mock 可手工触发）
- `POST /contracts/:id/state`（状态机跳转）
- `POST /contracts/:id/payments/:paymentId/register`（幂等键）
- `POST /contracts/:id/payments/:paymentId/voucher`

**项目 / 启动会**
- `GET /projects?status=...`
- `GET /projects/:id`
- `POST /projects`（需合同签字）
- `POST /projects/:id/transition`
- `POST /projects/:id/kickoffs`
- `GET /projects/:id/kickoffs`
- `PATCH /kickoffs/:id`（草稿可改）
- `POST /kickoffs/:id/finalize`（定稿 · project→running · customer→delivering · 批量派任务）

**任务**
- `GET /tasks?projectId=&assigneeId=&status=`
- `GET /tasks/mine`
- `POST /tasks`
- `GET /tasks/:id` · `PATCH /tasks/:id`
- `POST /tasks/:id/transition`
- `POST /tasks/scan-overdue`（手工触发，phase 8 改定时）

**视频**
- `GET /videos?projectId=&status=`
- `GET /videos/:id`
- `POST /videos`
- `PATCH /videos/:id`
- `POST /videos/:id/transition`
- `POST /videos/:id/raw-materials` · `POST /videos/:id/final-url`
- `POST /videos/:id/submit-for-review`（phase 7 小程序接住）

### 状态机

```
Contract:
  draft ──► pending_sign ──► signed ──► executing ──► completed ──► renewed
                    │            │            │
                    └─► draft   └─► terminated (任意)

Project:
  kickoff ──► running ──► at_risk ↔ running ──► completed / aborted

Task:
  pending ──► in_progress ──► pending_review ──► done
             │                    │
             └─► overdue         └─► rework ──► in_progress

Video:
  planning → shooting → editing → pending_review → approved → pending_publish → published → offline
                                        │
                                        ├─► minor_change ──► editing
                                        └─► reshoot ──► planning/shooting
```

所有非法跳转返回 409 + 对应 error.code。

### 跨 phase 联动

- `proposal.sign()` 触发 customer.stage → signed（phase 2 已有）
- `contract.esign-callback(signed=true)` 幂等地把 contract→signed，并在 customer.stage=proposing 时推到 signed
- `kickoff.finalize()` 触发 project→running + customer→delivering + 批量生成 Task

---

## Admin Web 产出

### 新视图（5）

- `views/contracts/ContractListView.vue` · 按状态 tab 分组
- `views/contracts/ContractDetailView.vue` · 合同正文 + 4 笔付款时间轴 + 发起电子签 / 手工回调按钮
- `views/projects/ProjectBoardView.vue` · 项目卡片网格
- `views/projects/ProjectDetailView.vue` · 视频看板（7 列）+ 任务 + 启动会 tab
- `views/tasks/MyTasksView.vue` · 逾期 / 今日 / 本周 / 已完成 四分区
- `views/videos/VideoListView.vue` · 全项目视频总览

### 菜单

phase 3 新亮起：**合同 · 项目 · 视频 · 我的任务**。

---

## 测试

### E2E（`pnpm --filter @mindlink/api test:e2e`）

**43/43 passed** · 4 suites：
- health (1)
- phase1-auth (13)
- phase2-lifecycle (15)
- phase3-contracts (14) · 本 phase 新增：
  - 合同创建 · 4 笔付款自动生成
  - send-for-signing → pending_sign
  - esign-callback mock → signed
  - 签后编辑 → 409
  - 幂等付款登记
  - 项目创建 · 启动会 finalize · 联动 customer.stage
  - 启动会 finalize 后再编辑 → 409
  - 任务状态机非法跳转 409
  - 视频状态机合法 / 非法路径
  - 跨租户 contract / project 隔离

### 全面穿行（`bash scripts/walkthrough.sh`）

**80/80 passed** · 从 phase 0 到 phase 3 一条路跑通，耗时 58 秒。新增 F（合同 · 6 断言）+ G（项目 · 启动会 · 任务 · 视频 · 14 断言）共 25 断言。

---

## 关键业务规则覆盖

| PRD 附录 C 规则 | 验证位置 | 结果 |
|---|---|---|
| 分笔付款 20/40/35/5 | `PAYMENT_RATIOS` + e2e F.1b + walkthrough F.1b | ✓ |
| 合同签字后不可改 | F.6 · e2e | ✓ |
| 启动会定稿不可改 | e2e "kickoff cannot be edited" | ✓ |
| 付款登记幂等 | F.4/F.5 · e2e | ✓ |
| 视频状态机严格 | G.7/G.8 | ✓ |
| 合同 signed 触发 customer.stage=signed | e2e "esign-callback" | ✓ |
| 启动会 finalize 触发 customer.stage=delivering | G.5 | ✓ |

---

## 交接给 Phase 4

### 可用 API

- 完整 `/contracts/*`、`/projects/*`、`/kickoffs/*`、`/tasks/*`、`/videos/*`、`/contract-templates`
- Video 已有 `copywriting / titles / tags` 字段，phase 4 AI 内容生产直接写入
- `LlmService.invoke()` mock 实现保留接口，phase 4 替换 provider

### 可复用后端

- `EsignService` 抽象层 · phase 8 接法大大 / e签宝时只需新 provider
- 4 个状态机常量（`CONTRACT_STATUS_TRANSITIONS` 等）供 phase 5/6 验证流转
- `TasksService.scanOverdue()` · phase 8 接 `@nestjs/schedule`

### 可复用前端

- `PaymentTimeline`（内联在 ContractDetailView，需要时可抽公共）
- 视频看板 7 列布局 · phase 7 小程序端成片审核可沿用色
- 我的任务四分区布局 · phase 4+ 其他用户体验相关页面可借鉴

---

## 已知问题 / 推迟项

- **合同 PDF 生成（puppeteer）**：当前为 markdown body，phase 8 接入
- **Excel 批量付款导入**：未做（MVP 不需，手工登记足够）
- **任务超期升级定时任务**：逻辑已写 `scanOverdue()`，但需手工 POST 触发；phase 8 接调度
- **视频审核流（打点批注 / 水印预览）**：归 phase 7（小程序主实装）
- **甘特图**：未做（V2 · 本期用视频看板替代）
- **兼职市场 / 多平台发布**：归 V2

---

## 启动

```bash
# 一次性建库 + 3 phase 种子
pnpm --filter @mindlink/api seed:phase-1
pnpm --filter @mindlink/api seed:phase-2
pnpm --filter @mindlink/api seed:phase-3

# 启动
pnpm --filter @mindlink/api dev          # :3000
pnpm --filter @mindlink/admin-web dev    # :5173

# 登录 13900000001 / Passw0rd!（A 公司管理员）
# 侧栏新亮起的菜单：
#   - 合同 · 看「长虹驾校」已签合同 + 4 笔付款时间轴
#   - 项目 · 看自动创建的项目 + 视频看板 7 列
#   - 视频 · 3 条视频（planning / editing / pending_review 各 1）
#   - 我的任务 · 5 条任务按紧急度分区
```

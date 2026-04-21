---
phase: 6
title: "S7 续约 · 流失 · 管理驾驶舱"
duration: "1.5周"
status: done
owner: "claude-opus-4-7"
blockers: []
depends-on: [0, 1, 2, 3, 4, 5]
produces:
  - apps/api/src/modules/renewals
  - apps/api/src/modules/churn
  - apps/api/src/modules/dashboard
  - apps/admin-web/src/views/renewals
  - apps/admin-web/src/views/churn
  - apps/admin-web/src/views/dashboard
last-updated: "2026-04-20"
---

# 阶段 6 · S7 · 续约 · 流失 · 管理驾驶舱

## 0 · 一句话目标

> 合同到期前 30 天自动进入续约预警 → PM 能生成续约提案、跟进谈判、标续约/流失；管理员打开驾驶舱即看客户红绿灯 + 团队产能 + 本月指标 + 现金流 + 今日 3 件决策。

## 1 · 前置依赖

- phase 0-5 完成
- `HealthScoreService` 可用（phase 5）
- `DataAggregator` 可用（phase 5）
- `LlmService.invoke()` 可用（续约提案生成）
- Contract、Customer、Project、Staff 数据齐全

## 2 · 范围

### 2.1 In-Scope

- **续约预警看板**：
  - 自动触发：合同到期前 30 天
  - 二维展示：健康度 × 到期时间
  - 一目了然哪些是紧急项
- **续约推进工具**：
  - 续约提案自动生成（基于 3 月数据 + 优惠政策）
  - 续约谈判记录
  - 续约方案版本管理
  - 推荐奖励（老客户推荐新客户抵续费）
- **流失管理**：
  - 流失原因分类（产品 / 价格 / 效果 / 客户关店 / 其他）
  - 流失访谈模板
  - 流失客户资产归档
  - 月度流失分析报告（给管理员）
- **管理驾驶舱**（严格按 `01_dashboard.html` 像素还原）：
  - 客户红绿灯（所有活跃客户按健康度分色）
  - 团队产能进度条（每角色本周产能占用）
  - 本月业务指标（新签 / 续约 / 流失 / 续约率 / 客单价 vs 目标）
  - 现金流（本月收入 / 成本 / 净利润）
  - 今日 3 件决策（系统自动识别）
- **业务目标管理**（驾驶舱"vs 目标"的目标值来源）：
  - 月度目标录入（新签客户数 / 续约客户数 / 流失红线）
  - 目标达成进度实时更新

### 2.2 Out-of-Scope

- 在线支付续费（V3）
- 推荐奖励自动抵扣（V2 做余额账户）
- 归因分析完整版（V2）
- 员工绩效 / 薪资（V2）

## 3 · 输出契约

### 3.1 新增文件清单

```
apps/api/src/modules/
├── renewals/
│   ├── renewals.controller.ts
│   ├── renewals.service.ts
│   ├── renewals.module.ts
│   ├── entities/
│   │   ├── renewal-record.entity.ts
│   │   ├── negotiation-note.entity.ts
│   │   └── referral-reward.entity.ts
│   ├── proposal-generator.ts
│   └── dto/{create,update,list,negotiate}.dto.ts
├── churn/
│   ├── churn.controller.ts
│   ├── churn.service.ts
│   ├── churn.module.ts
│   ├── entities/churn-record.entity.ts
│   └── dto/{create,interview,list}.dto.ts
├── dashboard/
│   ├── dashboard.controller.ts
│   ├── dashboard.service.ts
│   ├── dashboard.module.ts
│   ├── collectors/
│   │   ├── customer-light.collector.ts
│   │   ├── team-capacity.collector.ts
│   │   ├── monthly-kpi.collector.ts
│   │   ├── cashflow.collector.ts
│   │   └── daily-decisions.collector.ts
│   └── dto/
├── goals/
│   ├── goals.controller.ts
│   ├── goals.service.ts
│   ├── goals.module.ts
│   └── entities/company-goal.entity.ts

apps/api/src/common/scheduled-tasks/
├── renewal-warning.task.ts               // 每天 08:00 扫合同到期 30 天
├── churn-monthly-analysis.task.ts        // 每月 1 号分析
└── daily-decisions.task.ts               // 每天 08:30 识别 3 件决策

apps/api/src/migrations/
├── 0023-renewal-records.ts
├── 0024-negotiation-notes.ts
├── 0025-churn-records.ts
├── 0026-referral-rewards.ts
└── 0027-company-goals.ts

apps/api/src/seeds/phase-6.ts             // 到期客户种子 + 流失案例

apps/admin-web/src/views/
├── renewals/
│   ├── RenewalBoardView.vue              // 二维看板
│   ├── RenewalDetailView.vue             // 续约推进
│   ├── RenewalProposalEditorView.vue     // 提案编辑
│   └── components/
│       └── NegotiationTimeline.vue
├── churn/
│   ├── ChurnListView.vue
│   ├── ChurnInterviewModal.vue
│   ├── ChurnAnalyticsView.vue            // 月度流失分析
│   └── ChurnDetailView.vue
├── dashboard/
│   ├── DashboardView.vue                 // 像素还原 01_dashboard.html
│   └── components/
│       ├── CustomerLightsPanel.vue
│       ├── TeamCapacityPanel.vue
│       ├── MonthlyKpiPanel.vue
│       ├── CashflowPanel.vue
│       └── DailyDecisionsPanel.vue
├── goals/
│   └── GoalsSettingView.vue              // 月度目标录入

apps/admin-web/src/stores/
├── renewals.store.ts
├── churn.store.ts
├── dashboard.store.ts
└── goals.store.ts

packages/shared/src/types/
├── renewal.ts
├── churn.ts
├── dashboard.ts
└── goal.ts
```

### 3.2 数据库变更

- 新表：`renewal_records`（data-model §3.5）
- 新表：`negotiation_notes`（谈判记录子表）
- 新表：`referral_rewards`（推荐奖励账单，V2 再做扣抵）
- 新表：`churn_records`（流失档案：原因 + 访谈 + 时间）
- 新表：`company_goals`（月度目标：新签 N / 续约 N / 流失红线 N）
- 扩展 `customers`：`churned_at`、`churn_reason` 填充逻辑

### 3.3 对外 API

**续约**

| Method | Path | Roles | 说明 |
|---|---|---|---|
| GET | `/api/v1/renewals/board` | pm/admin | 二维看板数据 |
| GET | `/api/v1/renewals` | pm/admin | 列表 |
| GET | `/api/v1/renewals/:id` | owner/admin | 详情 |
| POST | `/api/v1/renewals/:id/generate-proposal` | pm | AI 生成续约提案 |
| PATCH | `/api/v1/renewals/:id/proposal` | pm | 编辑提案 |
| POST | `/api/v1/renewals/:id/notes` | pm | 记录谈判 |
| POST | `/api/v1/renewals/:id/won` | pm/admin | 标续约成功（触发生成新合同） |
| POST | `/api/v1/renewals/:id/lost` | pm/admin | 标续约失败 → 进入 churn |
| POST | `/api/v1/referrals` | pm/admin | 记录推荐奖励 |

**流失**

| Method | Path | Roles | 说明 |
|---|---|---|---|
| POST | `/api/v1/churn` | pm/admin | 标记流失（可脱离 renewal 独立使用） |
| POST | `/api/v1/churn/:id/interview` | pm | 记录流失访谈 |
| GET | `/api/v1/churn` | pm/admin | 流失列表 |
| GET | `/api/v1/churn/analytics` | admin | 月度流失分析 |

**驾驶舱**

| Method | Path | Roles | 说明 |
|---|---|---|---|
| GET | `/api/v1/dashboard` | admin | 全量聚合（5 模块） |
| GET | `/api/v1/dashboard/customer-lights` | admin | 客户红绿灯 |
| GET | `/api/v1/dashboard/team-capacity` | admin | 团队产能 |
| GET | `/api/v1/dashboard/monthly-kpi` | admin | 本月指标 |
| GET | `/api/v1/dashboard/cashflow` | admin | 现金流 |
| GET | `/api/v1/dashboard/daily-decisions` | admin | 今日 3 件决策 |
| POST | `/api/v1/dashboard/decisions/:id/dismiss` | admin | 忽略决策项 |

**业务目标**

| Method | Path | Roles | 说明 |
|---|---|---|---|
| GET | `/api/v1/goals` | admin | 当前月目标 |
| POST | `/api/v1/goals` | admin | 录入/更新目标 |

### 3.4 UI 页面

| 路由 | 页面 | 可见角色 | 原型 |
|---|---|---|---|
| `/renewals/board` | 续约看板 | pm/admin | 自设计 |
| `/renewals/:id` | 续约详情 | owner/admin | 自设计 |
| `/churn` | 流失列表 | pm/admin | 自设计 |
| `/churn/analytics` | 流失分析 | admin | 自设计 |
| `/dashboard` | 管理驾驶舱 | admin | **01_dashboard.html 像素还原** |
| `/goals` | 目标设置 | admin | 自设计 |

### 3.5 事件与任务

- 定时：`0 8 * * *` 续约预警扫描：到期前 30 天的合同 → 创建 `renewal_record(stage='warning')`
- 定时：`0 30 8 * * *` 每天 08:30 识别 3 件决策
- 定时：`0 3 1 * *` 每月 1 号 03:00 流失月度分析
- 事件：`renewal.warning_created`、`renewal.proposal_generated`、`renewal.won`、`renewal.lost`、`customer.churned`、`decision.identified`

## 4 · 任务清单

### DB

- [ ] migrations 0023-0027
- [ ] seed `phase-6.ts`：种子客户中插入 3 个"到期前 30 天" + 2 个"已流失"案例

### API · Renewals

- [ ] `RenewalWarningTask`：扫合同到期 30 天 → 创建 `renewal_record` 并设 customer.stage='renewing'
- [ ] `ProposalGenerator.generate(customerId)`：
  - 输入：3 月数据 + 健康度 + 现合同金额 + 优惠政策
  - 调 `LlmService.invoke('renewal-proposal', vars)` → 返回 markdown
  - 存到 `renewal_record.proposal`
- [ ] 续约 `won` 动作：
  - 创建新 Contract（基于 PM 选定方案），合同状态 draft
  - 导回合同签署流程（phase 3）
  - customer.stage 回到 `delivering`（新合同签后）
- [ ] 续约 `lost` 动作：创建 `churn_record` + customer.stage='churned'
- [ ] 推荐奖励：记录但不扣抵（V2）

### API · Churn

- [ ] CRUD
- [ ] 访谈记录：结构化字段（原因分类 + 追问）
- [ ] 月度分析：按原因分组 + 趋势 → 给 admin dashboard 公司层数据
- [ ] 资产归档：所有视频 / 月报 / 案例 关联到 churn_record，查询仍可见（不物理删）

### API · Dashboard

五个 collector 分别实现，聚合端点组合调用：

- [ ] `CustomerLightsCollector`：
  - 读所有 active 客户 + 其最新 healthScore
  - 按 level 分三组
- [ ] `TeamCapacityCollector`：
  - 本周所有员工的 task 数 / 容量（按角色平均任务数算占用率）
  - 100% 及以上 → 红色
- [ ] `MonthlyKpiCollector`：
  - 读 `company_goals` 本月
  - 新签客户数：本月 `customer.stage` 从 lead → signed
  - 续约客户数：本月 `renewal.stage='won'`
  - 流失客户数：本月 `customer.stage='churned'`
  - 续约率 = 续约 / (续约 + 流失)
  - 平均客单价 = 本月合同总额 / 客户数
- [ ] `CashflowCollector`：
  - 收入：本月所有 payment.paid_at 之和
  - 成本：MVP 阶段不采集（返回 0 或管理员手工录入 `monthly_costs` 表，本 phase 建）
  - 净利润 = 收入 - 成本
- [ ] `DailyDecisionsCollector`：
  - 扫描所有 open 事项，按权重排 Top 3：
    - 红灯客户未介入
    - 某角色 100% + 新客户待派
    - 新线索超过 24h 未分配
    - 合同签字超过 7 天未动
    - 付款逾期
  - 每天早晨重新计算（管理员可 dismiss）

### Admin Web · Renewals

- [ ] `RenewalBoardView`：二维坐标（X 轴：到期时间距今天数；Y 轴：健康度 0-100），客户为散点，危险象限高亮
- [ ] `RenewalDetailView`：合同摘要 + 提案编辑区 + 谈判时间轴 + 快捷按钮（生成 AI 提案 / 标续约成功 / 标流失）
- [ ] `NegotiationTimeline`：时间轴，每条记录（日期 + 沟通方式 + PM + 要点）

### Admin Web · Churn

- [ ] `ChurnListView`：流失客户列表 + 原因筛选
- [ ] `ChurnInterviewModal`：结构化表单（5 原因分类 + 追问字段 + 改进建议）
- [ ] `ChurnAnalyticsView`：原因饼图 + 月度趋势柱 + Top 3 原因卡

### Admin Web · Dashboard

**严格按 `prototype_extract/01_dashboard.html` 像素还原。**

- [ ] `DashboardView` 主页面
  - 顶部横幅：日期 + 天气 + 当月进度条
  - 布局 4 行 × 3 列 Grid
  - 第 1 行：客户红绿灯 (2/3) + 团队产能 (1/3)
  - 第 2 行：本月指标 (2/3) + 现金流 (1/3)
  - 第 3 行：今日 3 件决策（每件一个卡）
  - 底部：快捷入口（新建客户 / 查看所有客户 / 查看团队 / 查看财务）
- [ ] `CustomerLightsPanel`：绿/黄/红三大块，每块显示数量 + 点击展开客户列表
- [ ] `TeamCapacityPanel`：4 角色进度条（策划 / 编导 / 剪辑 / 投手），100% 显示红
- [ ] `MonthlyKpiPanel`：5 指标卡（新签 / 续约 / 流失 / 续约率 / 客单价），每个含当前值 vs 目标
- [ ] `CashflowPanel`：3 数字 + 点击跳财务
- [ ] `DailyDecisionsPanel`：3 卡片 + 每个卡"去看"按钮 + dismiss 小 X

### Admin Web · Goals

- [ ] `GoalsSettingView`：年月选择 + 5 指标录入表单

### Shared

- [ ] `RenewalRecord`、`NegotiationNote`、`ReferralReward`、`ChurnRecord`
- [ ] `DashboardData` 聚合类型（5 模块字段）
- [ ] `CompanyGoal`

## 5 · 数据模型

详见 [data-model.md](./shared/data-model.md) §3.5 RenewalRecord。

### 续约状态机

`warning → negotiating → (won | lost)`

`won` → 触发新 Contract 创建 + customer.stage 回到 `delivering`
`lost` → 触发 Churn 创建 + customer.stage = `churned`

## 6 · 关键业务规则

- **续约预警触发**：合同到期前 **30 天**（PRD 附录 C）
- **续约窗口**：到期前 30 天 ~ **到期后 7 天**（PRD 附录 C），超期不可再续，必须重新签新合同
- **续约优惠政策**（建议默认值，可配置）：
  - 绿灯客户：新合同减 5%
  - 黄灯客户：新合同平价
  - 红灯客户：新合同 + 客户成功保障条款
- **推荐奖励**：推荐 1 家成交 → 抵 10% 续费（MVP 记录不扣抵）
- **驾驶舱权限**：仅 admin 角色，PM/策划不可见
- **今日 3 件决策**：每天刷新，admin 可 dismiss，dismiss 记录 24h 内不再出现
- **流失原因分类**（PRD §4.7.4）：
  - 产品问题 / 价格问题 / 效果不达预期 / 客户业务本身关店 / 其他

## 7 · 原型视觉约束

- **`/dashboard` 像素级还原 `01_dashboard.html`**：
  - 色彩严格对齐：`dark-bg` 背景、白色卡片、`cyan` 强调、红绿灯语义色
  - 布局网格：4 行 × 3 列
  - 字号、间距、圆角、阴影严格对齐 `design-tokens.md`
- 续约看板 / 流失分析 / 目标设置：自设计，风格一致

## 8 · 测试用例最低要求

- [ ] 到期前 30 天合同 → 定时任务跑后出现 renewal_record，customer.stage='renewing'
- [ ] AI 生成续约提案返回 markdown
- [ ] 续约 won → 新合同（草稿）创建成功
- [ ] 续约 lost → churn_record 创建 + customer.stage='churned'
- [ ] 驾驶舱端点 PM 请求 → 403
- [ ] 驾驶舱 admin 请求 → 5 字段齐全
- [ ] 客户红绿灯数量 = 绿+黄+红 = 活跃客户总数
- [ ] 每天 08:30 定时跑完，3 件决策出现且可 dismiss
- [ ] 租户隔离
- [ ] 月度目标录入后下次驾驶舱查询"vs 目标"正确

## 9 · 验收标准

- [ ] **驾驶舱与 `01_dashboard.html` PNG 逐像素比对通过**（人工 review 关键）
- [ ] 完整 demo：某到期客户 → 续约预警 → 生成提案 → 谈判记录 → won → 新合同 OR lost → 流失访谈
- [ ] 定时任务 3 个全部可触发（手动调用 service）
- [ ] 今日 3 件决策规则覆盖至少 5 种事件类型
- [ ] 单测 ≥ 70%
- [ ] CLAUDE.md 追加更新

## 10 · 交接清单

**下游**：phase 7（小程序续约入口 + 续约方案查看）、phase 8（Beta 前驾驶舱审视）

### 可用 API

- 全套 `/api/v1/renewals/*`
- `/api/v1/churn/*`
- `/api/v1/dashboard/*`
- `/api/v1/goals`

### 可用数据

- `RenewalRecord`、`ChurnRecord`、`CompanyGoal`、`DashboardData`
- 种子：3 到期客户 + 2 流失案例

### 可复用能力

- `ProposalGenerator.generate(customerId)`：phase 7 客户端查看续约方案时复用
- `CustomerLightsCollector`：PM 工作台也可以引用
- `<HealthLight>`、`<DecisionCard>`、`<KpiProgressBar>` 组件

### 已知问题

- 成本数据纯手工录入 —— V2 接财务系统
- 今日决策识别规则是硬编码 —— V2 做规则引擎可配置
- 推荐奖励不扣抵 —— V2 余额账户

### 回归测试

- `e2e/renewal-flow.spec.ts`
- `e2e/churn-flow.spec.ts`
- `e2e/dashboard.spec.ts`
- 驾驶舱 Playwright visual regression vs PNG

## 11 · 风险与开放问题

- [ ] 待决策：到期后 7 天窗口内的客户是否进入流失自动扫描？— 当前不自动，PM 手动标
- [ ] 待决策：推荐奖励的折抵规则细节 —— 延后到 V2
- [ ] 技术风险：驾驶舱聚合查询在客户多时（500+ 活跃）性能 —— 建议加 Redis 缓存 5 分钟
- [ ] 视觉风险：人工逐像素 review 耗时 —— 用 Playwright 截图对比辅助

---

_文档版本_：1.0 · 2026-04-20

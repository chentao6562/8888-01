---
phase: 5
title: "S6 数据 · 月报 · 健康度"
duration: "1.5周"
status: done
owner: "claude-opus-4-7"
blockers: []
depends-on: [0, 1, 2, 3, 4]
produces:
  - apps/api/src/modules/metrics
  - apps/api/src/modules/reports
  - apps/api/src/modules/health-score
  - apps/api/src/modules/analytics
  - apps/admin-web/src/views/reports
  - apps/admin-web/src/views/analytics
  - apps/admin-web/src/views/metrics
last-updated: "2026-04-20"
---

# 阶段 5 · S6 · 数据 · 月报 · 健康度

## 0 · 一句话目标

> 月底自动为客户生成月度报告初稿 → PM 30 分钟修订 → 推送客户（推送通道由 phase 7 小程序/phase 8 实现）；客户健康度 5 维加权分可见。

## 1 · 前置依赖

- phase 0、1、2、3、4 完成
- `LlmService.invoke()` 可用（月报 AI 初稿）
- Video / Project 实体可用（月报数据来源）
- 手工 metrics 录入界面由本 phase 建，自动采集归 V2

## 2 · 范围

### 2.1 In-Scope

- **Metrics 数据录入**（手工）：
  - 视频日数据手动录入（各平台 plays/likes/comments/shares/collections + adSpend + roi）
  - 批量 Excel 导入（按平台模板）
  - 数据异常报警（下降 > 50% 推送给投手）
- **月度报告引擎**：
  - 自动拉取指定月度数据（Video × Metrics × Project.goals）
  - AI 生成初稿（6 段式结构）
  - 所见即所得编辑器（富文本 + 图表插件）
  - PDF 生成 + H5 静态页生成
  - 版本保存（draft → pending_review → sent）
  - 推送接口（推送动作由 phase 7 消费）
- **健康度评分**：
  - 5 维加权算法（业务 30% / 交付 20% / NPS 20% / 互动 15% / 投诉 15%）
  - 每月 1 号快照（`health_score_snapshots`）
  - 红绿灯自动打（85+ / 60-84 / <60）
- **NPS 流程**：
  - 月报读完触发 NPS 弹窗（phase 7 UI）
  - 评分 + 留言 API
  - 纳入健康度计算
- **三层数据分析**（基础版）：
  - **项目层**（PM/投手视角）：视频 ROI 排序 · 爆款 Top3 · 趋势图
  - **客户层**（PM/客户视角）：本客户 N 月 KPI 达成率趋势
  - **公司层**（管理员视角）：全公司营收 / 客户续约率 / 爆款率 / 团队产能（部分占位，phase 6 完善）
- **投诉记录**（健康度输入）：
  - 客户可在小程序提投诉（phase 7）
  - PM/admin Web 端录入
  - 月度计入健康度"投诉"维度

### 2.2 Out-of-Scope

- 自动数据采集（对接抖音/视频号/小红书开放平台，V2）
- 续约相关（phase 6）
- 管理驾驶舱（phase 6）
- 数据分析完整版 / 归因分析（V2）
- 投放管理完整版（V2）

## 3 · 输出契约

### 3.1 新增文件清单

```
apps/api/src/modules/
├── metrics/
│   ├── metrics.controller.ts
│   ├── metrics.service.ts
│   ├── metrics.module.ts
│   ├── entities/video-metric.entity.ts
│   └── dto/{create,batch-import,list,anomaly}.dto.ts
├── reports/
│   ├── reports.controller.ts
│   ├── reports.service.ts
│   ├── reports.module.ts
│   ├── entities/monthly-report.entity.ts
│   ├── generators/
│   │   ├── data-aggregator.ts
│   │   ├── ai-drafter.ts                // 调 LlmService
│   │   ├── pdf.generator.ts
│   │   └── h5.generator.ts
│   └── dto/{create,update,generate,push}.dto.ts
├── health-score/
│   ├── health-score.service.ts
│   ├── health-score.module.ts
│   ├── entities/health-score-snapshot.entity.ts
│   └── calculator/                      // 5 维算法拆分
│       ├── business.calculator.ts
│       ├── delivery.calculator.ts
│       ├── nps.calculator.ts
│       ├── interaction.calculator.ts
│       └── complaint.calculator.ts
├── nps/
│   ├── nps.controller.ts
│   ├── nps.service.ts
│   └── entities/nps-record.entity.ts
├── complaints/
│   ├── complaints.controller.ts
│   ├── complaints.service.ts
│   └── entities/complaint.entity.ts
├── analytics/
│   ├── analytics.controller.ts
│   ├── analytics.service.ts
│   └── dto/{project-layer,customer-layer,company-layer}.dto.ts

apps/api/src/common/scheduled-tasks/
├── monthly-report.task.ts                // 每月 1 号 05:00 自动生成上月报告
├── health-score.task.ts                  // 每月 1 号 06:00 计算健康度快照
└── metrics-anomaly.task.ts               // 每天 10:00 检测视频数据异常

apps/api/src/migrations/
├── 0018-video-metrics.ts
├── 0019-monthly-reports.ts
├── 0020-nps-records.ts
├── 0021-complaints.ts
└── 0022-health-score-snapshots.ts

apps/api/src/seeds/phase-5.ts             // 填充 3 月历史数据供 demo

apps/admin-web/src/views/
├── metrics/
│   ├── MetricsEntryView.vue              // 手工录入
│   ├── MetricsImportModal.vue            // Excel 批量
│   └── VideoMetricsTableView.vue
├── reports/
│   ├── MonthlyReportListView.vue         // 所有月报
│   ├── MonthlyReportEditorView.vue       // WYSIWYG
│   ├── MonthlyReportPreviewView.vue      // H5 预览
│   └── components/
│       ├── SectionOverview.vue
│       ├── SectionDeliverables.vue
│       ├── SectionTraffic.vue
│       ├── SectionTopVideos.vue
│       ├── SectionMissed.vue
│       └── SectionNextFocus.vue
├── analytics/
│   ├── ProjectAnalyticsView.vue          // 项目层
│   ├── CustomerAnalyticsView.vue         // 客户层
│   └── CompanyAnalyticsView.vue          // 公司层（admin）
└── health-score/
    └── HealthScoreDetailDrawer.vue       // 客户详情页嵌入抽屉

apps/admin-web/src/stores/
├── metrics.store.ts
├── reports.store.ts
└── analytics.store.ts

packages/shared/src/types/
├── metric.ts
├── report.ts
├── nps.ts
├── complaint.ts
└── health.ts
```

### 3.2 数据库变更

- 新表：`video_metrics`（data-model §2.6 的 VideoMetrics[] 拆出独立表，索引 `(video_id, platform, date)` 唯一）
- 新表：`monthly_reports`（data-model §3.4）
- 新表：`health_score_snapshots`（data-model §3.7）
- 新表：`nps_records`（customerId · reportId · score · comment · createdAt）
- 新表：`complaints`（customerId · severity · content · handledBy · handledAt）
- 扩展 `customers`：填充 `health_score` / `health_level` 字段（phase 2 已占位）

### 3.3 对外 API

**Metrics**

| Method | Path | Roles | 说明 |
|---|---|---|---|
| POST | `/api/v1/metrics/videos/:videoId` | adops/pm/admin | 录一天数据 |
| POST | `/api/v1/metrics/batch-import` | adops/admin | Excel 导入 |
| GET | `/api/v1/metrics/videos/:videoId` | any authed | 时序数据 |
| GET | `/api/v1/metrics/anomalies` | adops/pm/admin | 异常列表 |

**月报**

| Method | Path | Roles | 说明 |
|---|---|---|---|
| GET | `/api/v1/reports` | pm/admin | 月报列表 |
| GET | `/api/v1/reports/:id` | owner/admin/customer | 详情 |
| POST | `/api/v1/reports/generate` | pm/admin | 手动触发某月某客户生成 |
| PATCH | `/api/v1/reports/:id` | owner | 编辑 |
| POST | `/api/v1/reports/:id/generate-pdf` | owner | 导出 PDF |
| POST | `/api/v1/reports/:id/publish` | pm/admin | 推送给客户 |
| POST | `/api/v1/client/reports/:id/read` | customer | 客户读完回调（触发 NPS） |

**NPS**

| Method | Path | Roles | 说明 |
|---|---|---|---|
| POST | `/api/v1/client/nps` | customer | 客户端提交 NPS |
| GET | `/api/v1/nps` | pm/admin | NPS 列表 |

**投诉**

| Method | Path | Roles | 说明 |
|---|---|---|---|
| POST | `/api/v1/complaints` | pm/admin/customer | 新建投诉 |
| PATCH | `/api/v1/complaints/:id/handle` | pm/admin | 处理 |
| GET | `/api/v1/complaints` | pm/admin | 列表 |

**健康度**

| Method | Path | Roles | 说明 |
|---|---|---|---|
| GET | `/api/v1/customers/:id/health-score` | owner/admin | 当前评分 |
| GET | `/api/v1/customers/:id/health-score/history` | owner/admin | 历史快照 |
| POST | `/api/v1/customers/:id/health-score/recalculate` | admin | 手动重算 |

**三层分析**

| Method | Path | Roles | 说明 |
|---|---|---|---|
| GET | `/api/v1/analytics/projects/:id` | owner/admin/pm | 项目层 |
| GET | `/api/v1/analytics/customers/:id` | owner/admin/pm | 客户层 |
| GET | `/api/v1/analytics/company` | admin | 公司层 |

### 3.4 UI 页面

| 路由 | 页面 | 可见角色 |
|---|---|---|
| `/metrics` | 数据录入 | adops/pm/admin |
| `/metrics/videos/:id` | 视频数据时序 | adops/pm/admin |
| `/reports` | 月报列表 | pm/admin |
| `/reports/:id/edit` | 月报编辑 | owner |
| `/reports/:id/preview` | 月报预览 | owner/admin |
| `/analytics/projects/:id` | 项目分析 | owner/admin/pm |
| `/analytics/customers/:id` | 客户分析 | owner/admin/pm |
| `/analytics/company` | 公司分析 | admin |

### 3.5 事件与任务

- 定时：`0 5 1 * *`（每月 1 号 05:00）生成上月所有活跃客户月报初稿
- 定时：`0 6 1 * *`（每月 1 号 06:00）刷新所有客户健康度快照
- 定时：`0 10 * * *`（每天 10:00）视频数据异常扫描
- 事件：`report.generated`、`report.published`、`report.read`、`nps.submitted`、`complaint.created`、`complaint.handled`、`health_score.recalculated`

## 4 · 任务清单

### DB

- [ ] migrations 0018-0022
- [ ] seed `phase-5.ts`：给种子客户填充 3 个月视频数据 + 2 月月报 + 若干 NPS

### API · Metrics

- [ ] CRUD + 批量导入
- [ ] 异常检测规则：某视频日 plays 环比 < 50% → 记录 `anomaly`
- [ ] 异常推送：发给 video.adopsId + PM

### API · Reports

- [ ] `DataAggregator`：给定 (customerId, month) 汇总：视频清单 / metrics 合计 / goals 达成
- [ ] `AiDrafter`：调 `LlmService.invoke('monthly-report', vars)` → markdown 初稿
- [ ] `PdfGenerator`：markdown → HTML → PDF（复用 puppeteer）
- [ ] `H5Generator`：markdown → 独立静态 HTML（小程序 webview 或 Web H5 客户端读）
- [ ] `reports.publish()`：状态 → `sent`、写 `pushed_at`、emit 事件
- [ ] 客户端 `POST /reports/:id/read` 幂等、写 `read_at`、触发 NPS 流程

### API · NPS

- [ ] 提交接口：score 0-10 + 可选 comment，唯一约束 `(customer_id, report_id)`
- [ ] 自动关联本月健康度的 npsScore 维度

### API · 投诉

- [ ] CRUD + handle 动作
- [ ] severity: `low / mid / high`，high 计入月度健康度扣分更重

### API · 健康度

- [ ] 5 维 calculator 分别实现（输入 customerId, month）：
  - Business: 月度 KPI 达成率（gmv/footfall/roi 三项平均）
  - Delivery: 视频按时率 · 爆款比例（roi>1.5）· 平均播放量（归一化）
  - Nps: 本月 NPS 分数 × 10（0-100）
  - Interaction: 客户小程序登录次数 + 成片审核及时性（phase 7 数据）
  - Complaint: 100 - (complaints × severity_weight)
- [ ] `HealthScoreService.calculate(customerId, month)`：加权 → 总分 → level
- [ ] 月度快照任务

### API · 分析

- [ ] 项目层：视频 metrics 聚合 + 爆款 Top3 + 趋势
- [ ] 客户层：近 6 月 KPI 达成率 + NPS 趋势 + 健康度历史
- [ ] 公司层：当月 MRR / 客户总数 / 续约率（phase 6 完成后准确）/ 爆款率 / 员工产能

### Admin Web

- [ ] `MetricsEntryView`：选视频 + 日期 + 平台 → 填数字（表单验证）
- [ ] `MetricsImportModal`：下载 Excel 模板 + 上传解析
- [ ] `VideoMetricsTableView`：视频数据时序表格 + ECharts 趋势
- [ ] `MonthlyReportListView`：列表（客户 · 月份 · 状态 · 健康度徽章 · 操作）
- [ ] `MonthlyReportEditorView`：
  - WYSIWYG（推荐 tiptap + Vue 3 绑定）
  - 左侧 6 段式 outline
  - 右侧数据插件（拖拽插入图表 / 视频卡）
  - 顶部工具栏：AI 再生成该段 / 保存草稿 / 预览 / 发布
- [ ] `MonthlyReportPreviewView`：与 H5 一致的只读呈现
- [ ] 3 个 analytics view（项目/客户/公司），使用 ECharts
- [ ] `HealthScoreDetailDrawer`：在 客户详情页"健康度"tab 激活，显示 5 维雷达 + 历史趋势

### Shared

- [ ] `VideoMetric`、`MonthlyReport`、`NpsRecord`、`Complaint`、`HealthScoreSnapshot` 类型
- [ ] 月报 6 段 schema 固定

## 5 · 数据模型

详见 [data-model.md](./shared/data-model.md) §3.4 MonthlyReport、§3.7 HealthScoreSnapshot、§2.6 VideoMetrics。

### 月报状态机

`drafting → pending_review → sent → read`（单向）

## 6 · 关键业务规则

- **健康度权重**（PRD 附录 C）：
  - 业务 30% · 交付 20% · NPS 20% · 互动 15% · 投诉 15%
- **红绿灯阈值**：
  - ≥ 85 绿
  - 60-84 黄
  - < 60 红
- **NPS 触发**：**月报阅读完成后** 弹窗（PRD 附录 C）
- **月报结构固定 6 段**：总览 · 交付物 · 流量分析 · 爆款拆解 · 未达标反思 · 下月重点（PRD §4.6）
- **数据采集频次**：每日 02:00 —— MVP 是手工 "应该" 每日录入，任务仅检测异常不强制录入
- **首月健康度**：数据不足时默认 75（黄灯）
- **月报生成窗口**：每月 1 号生成上月；2 号前 PM 必须修订完；3 号自动推送（若 PM 未推）

## 7 · 原型视觉约束

- 月报 H5 预览风格：深蓝顶部 + 白底内容（对齐客户端设计原则）
- 月报编辑器：采用纯白背景 + 左右两栏，对齐客户详情 tab 的风格
- 三层分析页：ECharts 默认主题基于 design-tokens 自定义（navy/cyan 主色）
- 健康度雷达图用 5 维色彩（每维一色）

## 8 · 测试用例最低要求

- [ ] 定时任务生成某月报告 → 6 段齐全 → PM 可编辑 → 生成 PDF 成功
- [ ] 手动录入某视频 30 天数据 → 异常日触发
- [ ] NPS 提交 → 健康度 npsScore 维度更新
- [ ] 投诉 high 一条 → 健康度 complaint 维度降分
- [ ] 5 维 calculator 单测：已知输入 → 已知输出
- [ ] 月报 state machine：sent 后 PATCH → 409
- [ ] 租户隔离
- [ ] 管理员查询公司层分析 → PM 查询同端点 → 403

## 9 · 验收标准

- [ ] 完整 demo：为已有种子客户生成 3 月月报 → 编辑 → 生成 PDF → 发布（phase 7 集成时真正推送）
- [ ] 健康度雷达图 + 历史趋势可见
- [ ] 3 层分析页至少每层 3 个关键图表（柱/折线/饼）
- [ ] 月报 AI 初稿质量可用（采纳率 ≥ 60%，人工评估）
- [ ] 单测 ≥ 70%
- [ ] CLAUDE.md 追加更新

## 10 · 交接清单

**下游**：phase 6（续约需要健康度 + 历史月报 + 公司层数据）、phase 7（小程序读月报 + NPS 弹窗 + 投诉入口）

### 可用 API

- 完整 `/api/v1/metrics/*`
- 完整 `/api/v1/reports/*` + `/api/v1/client/reports/:id/read`
- 完整 `/api/v1/nps`、`/api/v1/complaints`
- `/api/v1/customers/:id/health-score`
- 三层分析端点

### 可用数据

- `VideoMetric`、`MonthlyReport`、`NpsRecord`、`Complaint`、`HealthScoreSnapshot`
- 种子：3 月历史数据 + 2 月月报 + 健康度快照

### 可复用能力

- `HealthScoreService.calculate()`：phase 6 续约预警直接调用
- `DataAggregator.aggregate(customerId, month)`：phase 6 续约提案数据源
- `<HealthScoreBadge>`、`<KpiProgressBar>`、`<TrendChart>` 组件

### 已知问题

- 数据纯手工，录入易遗漏 —— V2 接 API 解决
- 月报 AI 初稿质量依赖 prompt 调优 —— 持续迭代
- 互动维度依赖 phase 7 客户端行为数据，本 phase 完成前字段默认 0

### 回归测试

- `e2e/monthly-report-generation.spec.ts`
- `e2e/health-score.spec.ts`
- `e2e/nps-flow.spec.ts`

## 11 · 风险与开放问题

- [ ] 待决策：PM 未按时修订 → 自动推送原始 AI 初稿 vs 等待？— 当前方案自动推送 + 标"未修订"
- [ ] 待决策：互动维度数据来源 —— phase 7 客户端埋点细节（CC 确认）
- [ ] 技术风险：月报 H5 静态化 —— 推送给客户后 URL 稳定吗？方案：生成到 OSS CDN + 短域名

---

_文档版本_：1.0 · 2026-04-20

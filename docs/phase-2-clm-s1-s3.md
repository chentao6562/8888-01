---
phase: 2
title: "CLM S1-S3 · 线索·诊断·方案"
duration: "2周"
status: done
owner: "claude-opus-4-7"
blockers: []
depends-on: [0, 1]
produces:
  - apps/api/src/modules/leads
  - apps/api/src/modules/customers
  - apps/api/src/modules/diagnosis
  - apps/api/src/modules/proposals
  - apps/admin-web/src/views/leads
  - apps/admin-web/src/views/customers
  - apps/admin-web/src/views/diagnosis
  - apps/admin-web/src/views/proposals
last-updated: "2026-04-20"
---

# 阶段 2 · CLM S1-S3 · 线索 · 诊断 · 方案

## 0 · 一句话目标

> 新建一条线索 → 策划完成诊断 → 生成签字定位书 PDF，客户状态从 `lead` 走到 `proposing`。

## 1 · 前置依赖

- phase 0、1 完成
- `TenantGuard`、`RolesGuard`、`OwnershipGuard` 可用
- 至少 2 个测试租户 + 各 3 员工（phase 1 种子）
- OSS（MinIO 本地、COS 预留）可上传音频/图片
- LLM 能力在本 phase **全部 mock**（Service 返回 canned response，接入真 LLM 归 phase 4）

## 2 · 范围

### 2.1 In-Scope

- **S1 线索池**：
  - 客户表单录入、Excel 批量导入、官网外链表单（仅 endpoint 预留）
  - 看板视图 + 列表视图切换
  - 自动分配（按 PM 工作量均衡 / 按行业专长）
  - 24h 未跟进自动提醒
  - 初筛决策：转诊断 / 淘汰归档
- **S2 诊断工作台**：
  - 4 把刀问卷（结构化表单）
  - 4 张定位卡（在线填写 + 临时保存）
  - 录音上传（OSS 预签名）+ mock AI 转录
  - 门店照片上传（多图）
  - 60 问 AI 预访谈问卷（推送客户 mock）
  - mock AI 诊断报告初稿生成
- **S3 方案生成器**：
  - 套餐推荐引擎（基于诊断结论）
  - 报价计算器（套餐 + 定制项 + 地区系数）
  - 定位书 PDF 生成（使用深色品牌模板）
  - 方案版本管理（初版/修订/终版）
- **客户列表 + 详情**（像素级还原 `02_customers.html` + `03_customer_detail.html`）
- 客户生命周期状态机落 DB

### 2.2 Out-of-Scope

- 签合同（归 phase 3）
- 启动会（归 phase 3）
- 真实 LLM（归 phase 4）
- 电子签（归 phase 3 mock · phase 8 真实）
- 兼职市场（归 V2）

## 3 · 输出契约

### 3.1 新增文件清单

```
apps/api/src/
├── modules/
│   ├── leads/
│   │   ├── leads.controller.ts
│   │   ├── leads.service.ts
│   │   ├── leads.module.ts
│   │   └── dto/{create,update,import,assign,convert}.dto.ts
│   ├── customers/
│   │   ├── customers.controller.ts
│   │   ├── customers.service.ts
│   │   ├── customers.module.ts
│   │   ├── entities/customer.entity.ts
│   │   └── dto/{create,update,list,stage-transition}.dto.ts
│   ├── diagnosis/
│   │   ├── diagnosis.controller.ts
│   │   ├── diagnosis.service.ts
│   │   ├── diagnosis.module.ts
│   │   ├── entities/diagnosis-report.entity.ts
│   │   └── dto/{create,update-knife,update-card,generate-report}.dto.ts
│   ├── proposals/
│   │   ├── proposals.controller.ts
│   │   ├── proposals.service.ts
│   │   ├── proposals.module.ts
│   │   ├── entities/positioning-book.entity.ts
│   │   └── dto/{create,update,generate-pdf,calculate-quote}.dto.ts
│   ├── llm/
│   │   ├── llm.service.ts            // mock 实现，phase 4 替换
│   │   └── llm.module.ts
│   └── uploads/
│       ├── uploads.controller.ts     // 预签名 URL
│       └── uploads.service.ts
├── common/
│   └── scheduled-tasks/
│       └── lead-reminder.task.ts     // 24h 未跟进提醒
├── migrations/
│   ├── 0005-customers.ts
│   ├── 0006-diagnosis-reports.ts
│   ├── 0007-positioning-books.ts
│   └── 0008-lead-follow-ups.ts
└── seeds/
    └── phase-2.ts                    // 每租户 5 条 lead + 2 已完成诊断 + 1 签字定位书

apps/admin-web/src/
├── views/leads/
│   ├── LeadPoolView.vue              // 看板 + 列表切换
│   ├── LeadDetailView.vue
│   └── LeadImportModal.vue
├── views/customers/
│   ├── CustomerListView.vue          // 像素还原 02_customers.html
│   └── CustomerDetailView.vue        // 像素还原 03_customer_detail.html
├── views/diagnosis/
│   ├── DiagnosisWorkbenchView.vue    // 左栏步骤 + 右栏工作区
│   ├── components/
│   │   ├── InterviewStep.vue
│   │   ├── FourKnivesForm.vue
│   │   ├── FourCardsForm.vue
│   │   ├── AudioUploader.vue
│   │   └── PhotoGallery.vue
├── views/proposals/
│   ├── ProposalListView.vue
│   └── ProposalEditorView.vue        // 套餐选择 + 报价 + 预览
├── stores/
│   ├── leads.store.ts
│   ├── customers.store.ts
│   └── diagnosis.store.ts
└── components/business/
    ├── CustomerPicker.vue            // 客户选择器（全站复用）
    ├── StageBadge.vue                // 生命周期阶段徽章
    └── HealthLight.vue               // 红绿灯（phase 5 后才有数据，本 phase 先占位 green）

packages/shared/src/types/
├── customer.ts
├── lead.ts
├── diagnosis.ts
└── proposal.ts
```

### 3.2 数据库变更

- 新表：`customers`（含所有 S1-S7 需要字段；stage 字段驱动状态机）
- 新表：`lead_follow_ups`（线索跟进日志）
- 新表：`diagnosis_reports`
- 新表：`positioning_books`
- 新表：`proposals`（套餐 + 报价）
- 新表：`packages`（套餐定义，只有官方库初始种子）
- 新表：`uploads`（OSS 文件元数据）
- 扩展 `audit_logs`：增加 customer/diagnosis 相关事件

### 3.3 对外 API

| Method | Path | Roles | 说明 |
|---|---|---|---|
| GET | `/api/v1/leads` | admin/pm/strategist | 线索列表（含筛选） |
| POST | `/api/v1/leads` | admin/pm/strategist | 新建线索 |
| POST | `/api/v1/leads/import` | admin/pm/strategist | Excel 批量导入 |
| POST | `/api/v1/leads/webhook/website` | 无（签名保护） | 官网表单回调 |
| POST | `/api/v1/leads/:id/assign` | admin/pm | 分配负责人 |
| POST | `/api/v1/leads/:id/follow-ups` | owner | 记录跟进 |
| POST | `/api/v1/leads/:id/convert` | strategist/pm | 转诊断 → stage=`diagnosing` |
| POST | `/api/v1/leads/:id/archive` | strategist/pm | 淘汰归档 |
| GET | `/api/v1/customers` | admin/pm/strategist | 客户列表（所有 stage） |
| GET | `/api/v1/customers/:id` | owner/admin/pm | 客户详情 |
| PATCH | `/api/v1/customers/:id` | owner/admin | 编辑基础信息 |
| POST | `/api/v1/customers/:id/stage-transition` | pm/admin | 强制状态跳转（受状态机约束） |
| POST | `/api/v1/diagnosis` | strategist | 新建诊断（自动创建 report 空壳） |
| GET | `/api/v1/diagnosis/:id` | owner/admin/pm | 诊断详情 |
| PATCH | `/api/v1/diagnosis/:id` | owner | 更新 4 刀 4 卡任一字段 |
| POST | `/api/v1/diagnosis/:id/interview` | owner | 发起 AI 预访谈（mock 推送） |
| POST | `/api/v1/diagnosis/:id/generate-report` | owner | mock AI 生成诊断报告初稿 |
| POST | `/api/v1/diagnosis/:id/complete` | owner | 完成诊断 → stage=`proposing` |
| POST | `/api/v1/proposals` | strategist/pm | 新建方案 |
| PATCH | `/api/v1/proposals/:id` | owner | 编辑 |
| POST | `/api/v1/proposals/:id/calculate-quote` | owner | 报价计算器 |
| POST | `/api/v1/proposals/:id/generate-pdf` | owner | 生成定位书 PDF |
| POST | `/api/v1/proposals/:id/sign` | owner | 标记已签字（占位，phase 3 合同接入） |
| GET | `/api/v1/packages` | any authed | 套餐列表 |
| POST | `/api/v1/uploads/presign` | any authed | OSS 预签名 |

### 3.4 UI 页面

| 路由 | 页面 | 可见角色 | 原型依据 |
|---|---|---|---|
| `/leads` | 线索池 | admin/pm/strategist | 自设计，表头风格同 02_customers |
| `/leads/:id` | 线索详情 | owner/admin | 自设计 |
| `/customers` | 客户列表 | admin/pm/strategist | **02_customers.html** 像素还原 |
| `/customers/:id` | 客户详情 | owner/admin/pm | **03_customer_detail.html** 像素还原 |
| `/diagnosis/:customerId` | 诊断工作台 | strategist/pm | 自设计，左侧步骤导航 |
| `/proposals/:id` | 方案编辑 | strategist/pm | 自设计 |

### 3.5 事件与任务

- 定时：`0 */1 * * *`（每小时）检查 24h 未跟进线索 → 通知
- 事件：`lead.created`、`lead.assigned`、`lead.converted`、`lead.archived`
- 事件：`customer.stage_changed`（state machine 关键）
- 事件：`diagnosis.report_generated`
- 事件：`proposal.pdf_generated`、`proposal.signed`

## 4 · 任务清单

### DB

- [ ] migration 0005-0008
- [ ] 外键：`customers.pm_id → staff.id`、`diagnosis_reports.customer_id → customers.id` 等
- [ ] 索引：见 data-model §5
- [ ] 种子数据 `phase-2.ts`：每租户 5 线索 + 2 诊断 + 1 签字定位书

### API

- [ ] `CustomersModule`：CRUD + stage machine（见 §5）
- [ ] `LeadsController`：基于 customers 的 `stage=lead` 视图
- [ ] `LeadsService.autoAssign(lead)`：
  - 方案 A：取当前 PM 活跃线索最少的
  - 方案 B：按 industry 匹配 staff.tags（若配置）
  - 默认方案 A
- [ ] Excel 导入：`@nestjs/platform-express` + `xlsx`，错行回显错误
- [ ] `DiagnosisModule`：4 刀 4 卡 patch 接口支持单字段更新
- [ ] `LlmService.mockInterview(customerId)` → 返回预置 60 问答案
- [ ] `LlmService.mockDiagnosisReport(report)` → 返回基于 4 卡拼接的假报告
- [ ] `ProposalsModule`：
  - 套餐推荐：基于 `industry + budgetHint + goals` 关键词匹配 `packages` 表
  - 报价计算器：`basePrice * regionFactor + customItems`
  - PDF 生成用 `puppeteer` + 预置 HTML 模板（深色品牌封面）
- [ ] `UploadsController`：预签名 URL（见 API 约定 §10.1）
- [ ] `LeadReminderTask`：scan leads with `last_follow_up < now - 24h`
- [ ] 全部端点 e2e 测试覆盖

### Admin Web

- [ ] `LeadPoolView`：
  - 顶部 KPI 条（本周新增 / 已联系 / 已转诊断 / 转化率）
  - 筛选器（来源/行业/状态/负责人）
  - 看板 / 列表切换（看板列：待分配 → 已分配 → 已联系 → 转诊断 / 淘汰）
  - 批量 Excel 导入
- [ ] `CustomerListView`：表格列按 02_customers.html 还原（公司名·行业·阶段·健康度·PM·更新时间·操作）
- [ ] `CustomerDetailView`：左栏客户基础信息卡 + 右栏 tabs（概览/诊断/方案/合同占位/项目占位/月报占位）
- [ ] `DiagnosisWorkbenchView`：
  - 左侧导航 6 步（基础信息 / AI 访谈 / 现场照片录音 / 4 把刀 / 4 张卡 / 生成报告）
  - 每步完成勾选，未完成灰色
  - 顶部进度条整体完成度
- [ ] `ProposalEditorView`：
  - 套餐 3 选 1 + 定制项
  - 实时报价预览
  - 点 "生成 PDF" → 调接口 → 弹窗预览 → 下载
- [ ] `CustomerPicker` 全局复用组件
- [ ] `StageBadge` + `HealthLight` 组件
- [ ] 侧栏菜单新增：线索池 / 客户（按角色见菜单 config）

### Shared

- [ ] `Customer`、`Lead`、`DiagnosisReport`、`PositioningBook`、`Package` TS 类型
- [ ] `CustomerStage` 枚举完整
- [ ] `customer-stage-transitions.ts`：定义合法跳转表（用于前后端双端校验）

## 5 · 数据模型（本 phase 相关）

详见 [data-model.md](./shared/data-model.md) §2.3 Customer、§3.2 DiagnosisReport、§3.3 PositioningBook。

### Customer 状态机（本 phase 引入 lead/diagnosing/proposing）

```
lead ─(convert)─► diagnosing ─(complete)─► proposing ─(sign)─► (signed 归 phase 3)

任意 ─(archive)─► archived(软删 + deleted_at)
```

**非法跳转返回 409 `CUSTOMER_INVALID_STAGE_TRANSITION`**。

状态转换日志写入 `audit_logs`，字段 `from_stage` / `to_stage`。

## 6 · 关键业务规则

- **线索 SLA**（PRD 附录 C）：**24 小时内必须初筛/跟进**
- **自动分配**：新线索创建时触发；PM 超负荷（> 30 活跃线索）跳过该 PM
- **Excel 导入**：单次 ≤ 500 行；错误行不阻断正确行落库，错行下载错误报告
- **诊断完整性**：4 把刀 + 4 张卡全部必填才能调 "生成报告"；否则 422 `DIAGNOSIS_INCOMPLETE`
- **定位书 PDF**：使用租户 logo（无 logo 用平台 logo）；单份 ≤ 20 页
- **方案版本**：新建方案 version=1；编辑时前端有 "另存为新版本" 选项
- **自动状态跳转**：`POST /diagnosis/:id/complete` → customer.stage = `proposing`；`POST /proposals/:id/sign` → customer.stage = `signed`（此时需 phase 3 Contract 已预创建）
- **权限**：策划只能看自己负责的 + 未分配的；PM 能看所有；管理员全局

## 7 · 原型视觉约束

- **客户列表** `/customers`：**严格按** `prototype_extract/02_customers.html` 还原
  - 顶部 KPI 条 + 搜索筛选区
  - 表格：头像 + 公司名 + 行业标签 + 阶段芯片 + 健康度 light + PM 头像 + 更新时间 + 操作图标
- **客户详情** `/customers/:id`：**严格按** `prototype_extract/03_customer_detail.html` 还原
  - 左列客户卡：头像 + 基础信息 + 联系方式 + 关键时间节点
  - 右列 tabs：本 phase 激活"概览 / 诊断 / 方案"，其他 tab 占位禁用
- **诊断工作台**：原型未给出，按 design-tokens.md 风格自行扩展；左栏步骤导航风格对齐侧栏

## 8 · 测试用例最低要求

- [ ] 策划创建 lead → 自动分配给自己 → 转诊断成功
- [ ] 4 把刀某一项为空 → 生成报告 → 422
- [ ] 生成 PDF 可下载且 PDF 文件大小 > 10KB、含租户 logo
- [ ] 租户 A 不能查看租户 B 的客户/诊断/方案（3 表各验一次）
- [ ] 策划 X 不能访问策划 Y 负责的客户（Ownership）
- [ ] 状态机非法跳转：lead → proposing 返回 409
- [ ] Excel 导入 100 行 1 错 → 99 成功 + 1 错误报告下载
- [ ] 24h 未跟进扫描任务跑通

## 9 · 验收标准

- [ ] 所有任务清单完成
- [ ] e2e 测试 happy path: 线索 → 诊断 → 方案 → PDF 全链路
- [ ] 客户列表 + 客户详情 **与 PNG 逐像素比对通过**（人工 review）
- [ ] 诊断工作台 6 步全部可操作，每步有数据落 DB
- [ ] 方案 PDF 在 Chrome 中打开美观，含封面 + 目录 + 一张纸 + 完整说明
- [ ] Swagger 所有端点齐全
- [ ] 单元覆盖率 ≥ 70%
- [ ] CLAUDE.md 末尾追加时间戳

## 10 · 交接清单（Handoff to Phase 3）

### 可用 API

- 完整 `/api/v1/leads/*`、`/api/v1/customers/*`、`/api/v1/diagnosis/*`、`/api/v1/proposals/*`
- `/api/v1/uploads/presign`
- Customer 状态机 API（phase 3 需要接住 `proposing → signed`）

### 可用数据

- `Customer`、`DiagnosisReport`、`PositioningBook`、`Package` 实体
- 种子：每租户 5 线索 + 2 诊断 + 1 签字定位书

### 可复用组件

- `<CustomerPicker>` 全站选客户
- `<StageBadge>` 生命周期徽章
- `<HealthLight>` 红绿灯
- `<AudioUploader>`、`<PhotoGallery>`、`<FourKnivesForm>`、`<FourCardsForm>`
- API 层：`UploadsService.presign()` 通用预签名

### 已知问题

- `LlmService` 仍是 mock，`mockDiagnosisReport` 返回的报告较模板化 —— phase 4 替换
- 诊断录音的 AI 转录是 `[mock transcript]` 占位 —— phase 4 接入
- 地区系数表硬编码 —— V2 做运营可配置

### 回归测试

- `e2e/customer-lifecycle-s1-s3.spec.ts`
- `e2e/customer-tenant-isolation.spec.ts`
- 客户列表 / 详情页的 Playwright visual regression

## 11 · 风险与开放问题

- [ ] 待决策：Excel 导入模板字段是否含"预算区间"必填？— 当前软必填
- [ ] 待决策：策划转诊断后是否锁 lead 编辑？— 当前不锁，允许修正
- [ ] 技术风险：Puppeteer 生成 PDF 在 Docker 下字体问题 —— 预装中文字体到镜像

---

_文档版本_：1.0 · 2026-04-20

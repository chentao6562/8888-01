# Phase 2 · CLM S1-S3 · 完工报告

**完工时间**：2026-04-20
**owner**：claude-opus-4-7

## 一句话：一条线索可以从「S1 新增」走到「S3 方案签字」，客户 stage 按状态机严格流转，LLM 用 mock（phase 4 替换）。

---

## API 产出

### 新模块

- `customers/` · `leads/` · `diagnosis/` · `proposals/` · `llm/` · `uploads/`
- 实体：`CustomerEntity` · `LeadFollowUpEntity` · `DiagnosisReportEntity` · `PackageEntity` · `PositioningBookEntity` · `UploadEntity`

### 端点（29 个）

**customers**
- `GET /customers` · 列表（筛选 stage/industry/search + 分页）
- `GET /customers/stage-counts` · 按阶段聚合（驱动 KPI 条）
- `GET /customers/:id` · 详情（含 Ownership 校验）
- `POST /customers` · 新建（自动 stage=lead · 自动分配 PM/策划）
- `PATCH /customers/:id` · 改基础信息（stage 不通过此接口改）
- `POST /customers/:id/stage-transition` · 状态机跳转（非法 409）
- `POST /customers/:id/archive` · 归档（→ churned）
- `POST /customers/:id/follow-ups` · 记录跟进
- `GET /customers/:id/follow-ups` · 跟进历史

**leads**
- `GET /leads` · 线索列表（stage=lead）
- `POST /leads/:id/convert` · 转诊断（→ diagnosing）
- `POST /leads/:id/archive` · 淘汰
- `POST /leads/:id/assign` · 指派 PM/策划

**diagnosis**
- `POST /customers/:id/diagnosis` · 开启诊断（+ 自动进入 diagnosing）
- `GET /customers/:id/diagnosis` · 详情
- `PATCH /customers/:id/diagnosis` · 更新 4 刀 4 卡 + 报告内容
- `POST /customers/:id/diagnosis/interview` · mock AI 访谈问卷
- `POST /customers/:id/diagnosis/generate-report` · mock AI 诊断报告（强制 4 刀 4 卡齐全）
- `POST /customers/:id/diagnosis/complete` · 完成诊断 → stage=proposing

**proposals**
- `GET /packages` · 套餐库（官方 + 租户私库）
- `GET /customers/:id/package-recommendation` · 基于 budgetHint 推荐
- `POST /proposals/calculate-quote` · 报价计算器（不落库）
- `POST /customers/:id/proposals` · 创建方案（版本 +1 · mock LLM 初稿）
- `GET /customers/:id/proposals` · 列表
- `GET /proposals/:id` · 详情
- `PATCH /proposals/:id` · 编辑（签字后锁）
- `POST /proposals/:id/finalize` · 定稿
- `POST /proposals/:id/sign` · 标签字 → stage=signed

**uploads**
- `POST /uploads` · 本地磁盘上传（multer memoryStorage · phase 8 换 COS/OSS 预签名）

### 状态机

```
Customer:
  lead ──(convert)──► diagnosing ──(diagnosis.complete)──► proposing ──(proposal.sign)──► signed
                                        │
                                   (任意阶段 archive)
                                        ▼
                                    churned
```

非法跳转 409 `CUSTOMER_INVALID_STAGE_TRANSITION`。

---

## Admin Web 产出

### 新视图

- `views/customers/CustomerListView.vue` · **像素级还原** `02_customers.html`（KPI 条 7 段 + 工具条 + 表格 + 健康度光条 + 阶段芯片）
- `views/customers/CustomerDetailView.vue` · **像素级还原** `03_customer_detail.html`（左客户卡 + 右 tabs：概览/诊断/方案/跟进）
- `views/customers/CustomerNewModal.vue` · 创建客户弹窗
- `views/leads/LeadPoolView.vue` · 线索池（含 24h 未跟进高亮）
- `views/diagnosis/DiagnosisWorkbenchView.vue` · 6 步骤导航（基础 · AI 访谈 · 4 刀 · 4 卡 · 报告 · 完成）+ 整体进度条
- `views/proposals/ProposalEditorView.vue` · 套餐三选一 + 报价计算器 + 一张纸 + 完整定位书 + 签字流

### 菜单激活

侧栏新亮起「线索池」和「客户管理」。项目看板、内容生产、案例库、我的任务等仍占位。

---

## 测试

### E2E（`pnpm --filter @mindlink/api test:e2e`）

**29/29 passed** 覆盖三个 suite：
- `health.e2e-spec.ts` (1)
- `phase1-auth.e2e-spec.ts` (13)
- `phase2-lifecycle.e2e-spec.ts` (15) · 本 phase 新增：
  - 注册租户 A/B + 新建客户 + 跨租户隔离
  - 非法跳转拦截（lead → proposing → 409）
  - 完整闭环：convert → diagnosis → fill cards → AI report → complete → customer.stage=proposing
  - 诊断 state guard：卡片未齐全 → 422、完成后再编辑 → 403
  - 跟进记录持久化

### 真实冒烟

使用 `seed:phase-1 + seed:phase-2` 后登录租户 A：
- ✓ 客户列表返回 5 客户（lead/diagnosing/proposing/signed/delivering 各 1）
- ✓ stage-counts 精确匹配
- ✓ packages 列出 3 个官方套餐
- ✓ calculate-quote 月度包 × 1.1 系数 = ¥24,750（中位数 22,500 × 1.1）

---

## 交接给 Phase 3

### 可用 API

- customer 状态到 `signed` 后，phase 3 接住创建 Contract + Project（合同需要 `customer.stage==='signed'`）
- `Customer.contractExpiresAt` 字段已就位，phase 6 续约模块填充
- `UploadsService.save()` 通用上传服务，phase 3 合同 PDF / 启动会纪要 PDF 可直接复用

### 可复用前端

- `CustomerNewModal`、`stage-tag` 样式、`health-score` 样式（已内联于视图，phase 6 驾驶舱可迁出公用）
- `ProposalEditorView.vue` 的 tabs / card 结构，phase 3 合同编辑器可参照

### 可复用后端

- `STAGE_TRANSITIONS` 常量（src/modules/customers/entities/customer.entity.ts）
- `CustomersService.transitionStage()` · phase 3 合同/项目模块直接调
- `CustomersService.addFollowUp()` · phase 8 客户关怀消息可复用

---

## 已知问题 / 推迟项

- **Puppeteer PDF 生成**：当前仅 markdown 渲染。phase 3 引入合同 PDF 时一起接入 puppeteer，phase 2 定位书 PDF 可同步补
- **Excel 批量导入**：DTO/UI 未做，phase 3 空档接入或 V2
- **24h 未跟进定时任务**：数据模型已准备 `lead_follow_ups` 表，任务调度器未引入（phase 8 接 `@nestjs/schedule`）
- **`MockProvider` LLM**：phase 4 引入真实 provider 后替换 `src/modules/llm/llm.service.ts` 的 `renderMock`
- **Ownership**：策划仅能访问自己负责或未分配的客户（`assertOwnership`），但尚未批量过滤列表（列表仍按租户全量）。V2 强化

---

## 启动

```bash
# 一次性建库 + 种子（dev SQLite）
pnpm --filter @mindlink/api seed:phase-1
pnpm --filter @mindlink/api seed:phase-2

# 启动三端
pnpm --filter @mindlink/api dev          # :3000
pnpm --filter @mindlink/admin-web dev    # :5173

# 登录（种子账号）
# A 公司管理员：13900000001 / Passw0rd!
# B 公司管理员：13900000101 / Passw0rd!
```

打开 http://localhost:5173 → 登录 → 侧栏「线索池」或「客户管理」开工。

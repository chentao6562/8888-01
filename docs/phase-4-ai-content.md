---
phase: 4
title: "AI 内容生产助手"
duration: "1.5周"
status: done
owner: "claude-opus-4-7"
blockers: []
depends-on: [0, 1, 2, 3]
produces:
  - apps/api/src/modules/llm
  - apps/api/src/modules/ai-content
  - apps/api/src/modules/cases
  - apps/admin-web/src/views/content-studio
  - apps/admin-web/src/views/cases
last-updated: "2026-04-20"
---

# 阶段 4 · AI 内容生产助手（MVP 简版）

## 0 · 一句话目标

> 策划用 AI 生成一条视频的完整 文案+标题+标签 组合 < 5 分钟；替换 phase 2/3 的 mock LLM 为真实调用。

## 1 · 前置依赖

- phase 0、1、2、3 完成
- Video 实体可用（phase 3）
- phase 2 的 `LlmService` 为 mock 接口 —— 本 phase 替换
- 需要一个 LLM 账号（推荐顺序：**通义千问 → DeepSeek → GPT**），MVP 只接 1 家
- 环境变量：`LLM_PROVIDER`、`LLM_API_KEY`、`LLM_BASE_URL`

## 2 · 范围

### 2.1 In-Scope

- **LLM 网关**（`LlmService` 完整实装）：
  - LangChain.js 适配一个 Provider
  - Prompt 模板化（抽到文件）
  - 流式与非流式两种模式
  - 配额记账（按租户 aiQuotaUsed）
  - 错误降级（超时、限流、异常）
- **AI 文案**：输入卖点 + 证据 + 框架 → 输出钩子 · 主体 · CTA 三段
- **AI 标题**：基于视频草稿 → 5 候选 + 预期点击率排序
- **AI 标签**：平台 + 行业 + 本地 + 热点匹配推荐 10-15 个
- **敏感词检测**：基于本地词库 + LLM 二次复核
- **方言适配**：标准话术 / 呼市话 / 东北话 3 种开关
- **老板口播辅助**（小程序由 phase 7 做 UI，本 phase 做后端）：
  - 提词器 API（接收视频 ID → 返回分段脚本）
  - 分段录制上传接口
  - 自动剪辑 **不做**（PRD §5.5 MVP 不含）
- **案例库 MVP 基础版**：
  - 文案库、标题库（其他 4 库占位）
  - 手动入库 + 搜索 + 调用计数
  - 租户私库（官方库归 V2）
- **替换 phase 2 mock**：
  - `AI 访谈预问卷`：输入客户基础信息 → 60 问动态问答
  - `AI 诊断报告`：输入 4 卡 → 报告初稿
  - `AI 定位书初稿`：输入诊断 → 定位书 markdown

### 2.2 Out-of-Scope

- AI 分镜可视化（V2）
- 多平台发布（V2）
- 自动剪辑（V2）
- 案例库自动回流（V2）
- 官方案例库（V2）
- AI 训练 / fine-tune（V2+）

## 3 · 输出契约

### 3.1 新增文件清单

```
apps/api/src/modules/
├── llm/
│   ├── llm.module.ts
│   ├── llm.service.ts                   // 替换 phase 2 mock
│   ├── providers/
│   │   ├── llm-provider.interface.ts
│   │   ├── tongyi.provider.ts
│   │   ├── deepseek.provider.ts
│   │   └── openai.provider.ts
│   ├── prompts/
│   │   ├── interview.prompt.ts
│   │   ├── diagnosis.prompt.ts
│   │   ├── positioning.prompt.ts
│   │   ├── copywriting.prompt.ts
│   │   ├── titles.prompt.ts
│   │   ├── tags.prompt.ts
│   │   └── dialect.prompt.ts
│   ├── sensitive-words/
│   │   ├── sensitive.service.ts
│   │   └── dict/                        // 敏感词库（JSON）
│   ├── quota/
│   │   └── quota.service.ts             // 租户 AI 配额
│   └── dto/
├── ai-content/
│   ├── ai-content.controller.ts
│   ├── ai-content.service.ts
│   ├── ai-content.module.ts
│   └── dto/{copy,titles,tags,dialect}.dto.ts
├── teleprompter/
│   ├── teleprompter.controller.ts
│   ├── teleprompter.service.ts
│   └── dto/
├── cases/
│   ├── cases.controller.ts
│   ├── cases.service.ts
│   ├── cases.module.ts
│   ├── entities/case.entity.ts
│   └── dto/{create,list,search}.dto.ts

apps/api/src/migrations/
├── 0016-cases.ts
└── 0017-llm-usage-logs.ts

apps/api/src/seeds/phase-4.ts             // 每租户 20 条种子案例

apps/admin-web/src/views/
├── content-studio/
│   ├── CopywritingView.vue               // AI 文案
│   ├── TitlesView.vue                    // AI 标题
│   ├── TagsView.vue                      // AI 标签
│   ├── DialectSwitcher.vue               // 方言切换组件
│   └── SensitiveWordIndicator.vue        // 实时检测显示
├── cases/
│   ├── CaseLibraryView.vue               // 6 子库 tabs，本 phase 激活 2
│   ├── CaseDetailView.vue
│   └── CaseSubmitModal.vue               // 手动入库

apps/admin-web/src/stores/
├── ai-content.store.ts
└── cases.store.ts

packages/shared/src/types/
├── case.ts
└── ai-content.ts
```

### 3.2 数据库变更

- 新表：`cases`（data-model §2.7）
- 新表：`llm_usage_logs`（每次调用记录：tenant_id · user_id · prompt_template · tokens_in · tokens_out · latency_ms · success · error）
- 扩展 `tenants`：`ai_quota_used`（int）+ `ai_quota_reset_at`（date）
- 扩展 `videos`：无新字段，`titles`、`tags`、`copywriting` 本 phase 落数据
- 扩展 `subscriptions`：`ai_quota_limit` 按 plan 初始化

### 3.3 对外 API

| Method | Path | Roles | 说明 |
|---|---|---|---|
| POST | `/api/v1/ai/copywriting` | strategist/pm/creator | AI 文案（钩子+主体+CTA） |
| POST | `/api/v1/ai/titles` | strategist/pm/creator | 5 候选标题 |
| POST | `/api/v1/ai/tags` | strategist/pm/creator/adops | 推荐标签 |
| POST | `/api/v1/ai/dialect-adapt` | any authed | 方言转换 |
| POST | `/api/v1/ai/sensitive-check` | any authed | 敏感词检测 |
| POST | `/api/v1/ai/interview/:customerId` | strategist | 启动 AI 访谈（替换 phase 2 mock） |
| POST | `/api/v1/ai/diagnosis-report/:diagnosisId` | strategist | 生成诊断报告初稿 |
| POST | `/api/v1/ai/positioning-book/:proposalId` | strategist | 生成定位书初稿 |
| GET | `/api/v1/teleprompter/videos/:id` | creator/owner | 获取分段脚本 |
| POST | `/api/v1/teleprompter/videos/:id/segments` | creator | 上传分段录制 |
| GET | `/api/v1/cases` | any authed | 案例库列表（含 category 筛选） |
| GET | `/api/v1/cases/:id` | any authed | 详情 + callCount++ |
| POST | `/api/v1/cases` | strategist/pm/admin | 手动入库 |
| POST | `/api/v1/cases/search` | any authed | 关键词/向量搜索 |
| DELETE | `/api/v1/cases/:id` | admin/owner | 软删除 |

### 3.4 UI 页面

| 路由 | 页面 | 可见角色 |
|---|---|---|
| `/content-studio/copywriting` | AI 文案 | strategist/pm/creator |
| `/content-studio/titles` | AI 标题 | strategist/pm/creator |
| `/content-studio/tags` | AI 标签 | strategist/pm/creator/adops |
| `/cases` | 案例库（6 tabs，激活文案/标题） | any authed |
| `/cases/:id` | 案例详情 | any authed |

### 3.5 事件与任务

- 事件：`ai.invocation`（每次调用 emit，用于监控 + 配额）
- 事件：`ai.quota_exceeded`
- 事件：`case.created`、`case.called`
- 定时：每月 1 号 00:00 重置租户 aiQuotaUsed

## 4 · 任务清单

### DB

- [ ] migrations 0016-0017
- [ ] 种子 20 条文案 / 标题（手动构造，带 industry/tags）

### API · LLM Core

- [ ] `LlmProviderInterface`：`chat(messages, options)` 返回 `{ content, usage }`
- [ ] 三个 provider 实现，通过 env 切换
- [ ] `LlmService.invoke(promptName, variables, opts)` 统一入口
- [ ] Prompt 模板化：用 `langchain/prompts` `PromptTemplate`
- [ ] `QuotaService`：调用前预检、调用后记账，超限抛 `LLM_QUOTA_EXCEEDED`
- [ ] 超时 30s 默认，失败重试 1 次（指数退避）
- [ ] `LlmUsageLog` 每次调用落库

### API · AI-Content

- [ ] 6 个 AI 端点，Zod 严格 DTO
- [ ] 调用前敏感词预检（本地词库）
- [ ] 调用后敏感词复检（LLM 打分，可选）
- [ ] 结果裁剪：文案 ≤ 500 字、标题 ≤ 30 字、标签 ≤ 15 个

### API · 替换 phase 2 mock

- [ ] `AI interview`：动态多轮问答，每轮存 `pre_interview_answers` JSON
- [ ] `AI diagnosis-report`：输入 4 卡 → 输出 markdown + 存 `report_content`
- [ ] `AI positioning-book`：输入诊断报告 + 套餐 → 输出 markdown，作为定位书初稿

### API · Teleprompter

- [ ] 按视频 script 切分段（按句号分割）
- [ ] 分段上传 → 存 `teleprompter_segments` 子表（不在 data-model 主库中，本 phase 新增轻量表）

### API · Cases

- [ ] CRUD
- [ ] 搜索：关键词 + 可选 pgvector 向量相似（预埋 pgvector，MVP 仅关键词生效）
- [ ] 调用计数器：GET detail 时 `callCount++`、`lastCalledAt=now()`
- [ ] 手动入库：从 Video 选 → 填 category/title/content → save

### Admin Web

- [ ] `CopywritingView`：
  - 左：输入区（卖点 + 证据 + 框架选择：故事型 / 对比型 / 干货型）
  - 右：输出区三段（钩子/主体/CTA）+ "采用" / "再生成"
  - 顶部：方言切换 + 实时敏感词指示
- [ ] `TitlesView`：输入视频简介 → 5 候选 + 每条预期点击率徽章（LLM 打分）
- [ ] `TagsView`：选平台 → 输入内容 → 生成 10-15 标签（多选，一键拷贝）
- [ ] `DialectSwitcher`：三选一切换，实时重写
- [ ] `SensitiveWordIndicator`：红色下划线标出
- [ ] `CaseLibraryView`：左侧 6 子库 tabs（MVP 激活文案/标题，其他灰掉）
- [ ] `CaseSubmitModal`：选 category → 填字段 → 可选关联 video → 保存

### Shared

- [ ] `AiCopywritingRequest` / `Response`
- [ ] `AiTitlesRequest` / `Response`
- [ ] `AiTagsRequest` / `Response`
- [ ] `Case`、`CaseCategory` 枚举
- [ ] `DialectType`: `'standard' | 'hohhot' | 'dongbei'`

## 5 · 数据模型

详见 [data-model.md](./shared/data-model.md) §2.7 Case。

本 phase 新增 `llm_usage_logs`（非业务实体，不进主库）：

```typescript
interface LlmUsageLog {
  id: string;
  tenantId: string;
  staffId: string;
  promptName: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  success: boolean;
  errorCode: string | null;
  createdAt: Date;
}
```

## 6 · 关键业务规则

- **AI 配额**（PRD §1.6）：
  - basic: 50,000 次/月，超量 ¥0.02/次
  - pro: 200,000 次/月，超量 ¥0.015/次
  - enterprise: 1,000,000 次/月，阶梯定价
  - MVP 只做"到限制抛 429"，不做按量计费（V2）
- **敏感词**：命中 → 不调用 LLM，直接 422 返回命中词
- **方言适配**：呼市话 / 东北话为 prompt 附加指令，不单独训模型
- **Prompt 稳定性**：同 (promptName, variables) 输入 → 温度 0.3 保持相对稳定
- **案例库调用计数**：只对 `GET /cases/:id detail` 计数（list 不计）
- **老化机制**：MVP 仅标 freshness，不做自动下架

## 7 · 原型视觉约束

- 内容生产页（新增）：按 design-tokens.md 自行设计
- 建议布局：左输入右输出，顶部方言/敏感词控制栏
- 案例库 tab 风格对齐客户详情 tab

## 8 · 测试用例最低要求

- [ ] AI 文案端到端：正常生成 → 三段结构完整
- [ ] 敏感词（预置"赌博"）直接拦截 → 422，不消耗配额
- [ ] LLM 超时 → 502 + 用户友好 message
- [ ] 配额超限 → 429
- [ ] 方言切换（同输入 3 方言）→ 输出不同
- [ ] 案例库搜索命中 → callCount++
- [ ] 跨租户：租户 A 不能查询 / 调用租户 B 的案例（私库隔离）
- [ ] phase 2 的 mock 已完全替换，诊断报告 / 定位书初稿可被策划采纳编辑

## 9 · 验收标准

- [ ] 5 分钟 demo：从 Video 详情 → 点 "AI 文案" → 生成 → 采用 → 生成 "标题" → 选 → 生成 "标签" → 采用 → 保存到 Video
- [ ] LLM provider 可切换（env 改完重启生效）
- [ ] 配额用量在员工管理页可查（或至少 Swagger 接口可查）
- [ ] 案例库 MVP 可手动添加 / 搜索 / 调用
- [ ] 单测 ≥ 70%，含 prompt snapshot 测试
- [ ] CLAUDE.md 追加更新

## 10 · 交接清单（Handoff）

**下游**：phase 5（月报引擎用 LLM）、phase 6（续约提案用 LLM）、phase 7（小程序口播辅助 UI）

### 可用 API

- 全套 `/api/v1/ai/*`
- `/api/v1/cases/*`
- `/api/v1/teleprompter/*`

### 可用数据

- `Case` 实体
- 种子：每租户 20 案例

### 可复用能力

- `LlmService.invoke(promptName, variables, opts)`：任何 phase 写新 prompt 即可接入
- `SensitiveService.check(text)`：同上
- `QuotaService.consume(tenantId, count)`：外部付费调用也走此层
- 前端：`<DialectSwitcher>`、`<SensitiveWordIndicator>`

### 已知问题

- Prompt 质量强依赖人工调优，建议 beta 期间持续 A/B
- 案例库搜索没用向量 —— V2 接 pgvector 优化
- 呼市话 / 东北话效果取决于 LLM 本身

### 回归测试

- `e2e/ai-content.spec.ts`
- `e2e/quota.spec.ts`
- `e2e/sensitive-check.spec.ts`

## 11 · 风险与开放问题

- [ ] 待决策：MVP LLM 供应商 ← CC 选择（默认通义千问，国内合规最稳）
- [ ] 待决策：敏感词库维护方式（当前 JSON 硬编码 · V2 做管理后台）
- [ ] 业务风险：AI 输出质量参差 —— 添加"采纳率"埋点跟踪
- [ ] 合规风险：用户数据是否流向 LLM —— 合同客户信息脱敏后再调用

---

_文档版本_：1.0 · 2026-04-20

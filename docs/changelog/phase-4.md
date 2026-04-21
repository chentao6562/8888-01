# Phase 4 · AI 内容生产助手 · 完工报告

**完工时间**：2026-04-20
**owner**：claude-opus-4-7

## 一句话

策划打开"内容生产"页面，输入卖点 + 证据，5 秒拿到钩子+主体+CTA 三段文案；另起一行拿 5 个标题候选；再切一下拿 15 个标签；随时可换呼市话 / 东北话口吻。敏感词预检和后检双保险，配额按租户档位硬限。

---

## API 产出

### 升级的 LLM 网关

- **Provider 抽象层**：`LlmProvider` 接口 · `MockLlmProvider`（默认，offline 友好，确定性输出）+ `OpenAiCompatProvider`（OpenAI 协议 · 支持通义/DeepSeek/GPT-4o）
- **切换方式**：`LLM_PROVIDER=mock | openai-compat` + `LLM_API_KEY` + `LLM_BASE_URL` + `LLM_MODEL`，默认 mock
- **配额**：按 plan 档位硬限（basic 5万 / pro 20万 / enterprise 100万 每月），超限 429 `LLM_QUOTA_EXCEEDED`
- **用量统计**：`llm_usage_logs` 表记录每次调用（provider · promptName · tokens · 延时 · success），`GET /ai/usage` 查询本月已用
- **Prompt 模板**：system 里加 `[prompt:<name>] [dialect:<x>]` 标记，让 mock provider 识别切换输出风格；真实 provider 会照读并在输出中遵循

### 新增模块

1. **ai-content** · 7 端点
   - `POST /ai/copywriting` · 钩子 · 主体 · CTA 三段（带方言 + framework 选择）
   - `POST /ai/titles` · 5 候选按预期点击率排序
   - `POST /ai/tags` · 15 标签（平台 + 行业 + 本地 + 热点）
   - `POST /ai/dialect-adapt` · 标准 ↔ 呼市话 ↔ 东北话
   - `POST /ai/sensitive-check` · 独立端点（**不消耗配额**）
   - `GET /ai/usage` · 本月用量 + 上限 + 当前 provider
2. **cases** · 4 端点
   - `GET /cases` · 官方 + 租户私库合并（按 category / search 过滤）
   - `GET /cases/:id` · 详情（自动 callCount++ · lastCalledAt 更新）
   - `POST /cases` · 手动入库（仅私库）
   - `DELETE /cases/:id` · 删除私库（官方库不可删）
3. **teleprompter** · 2 端点
   - `GET /teleprompter/videos/:videoId` · 按句切分 script · 估总时长（4 字/秒）
   - `POST /teleprompter/videos/:videoId/segments/:index` · 上传分段录音 URL（phase 7 小程序端消费）

### 新增实体

- `LlmUsageLogEntity` · 调用日志
- `CaseEntity` · 案例库（category: copy/scene/bgm/title/tag/campaign · callCount · freshness）

### 跨 phase 联动

- phase-2 / phase-3 的 `LlmService.invoke()` 签名从 2 参改 3 参（加 `opts.tenantId`），已同步更新 `DiagnosisService` · `ProposalsService`
- 诊断报告生成 / 定位书初稿 / 月报（phase 5）等走同一网关，统一配额与日志

### 敏感词策略

```
BLOCKLIST = ['赌博', '博彩', '投注', '加微信发红包', '全网最牛',
             '全国第一', '国家级认证', '全网最低价', '假一赔十',
             '粉丝群', '私域引流', '私聊加微信']
```

**两级防护**：
1. **预检**（调用 LLM 前）· 用户输入命中 → 直接 422，不消耗配额
2. **后检**（LLM 返回后）· AI 生成物命中 → 422 with `stage: 'post'`，防止 mock/真实 provider 吐出踩雷文本

规则：只收录**明确违规**的短语，**不收单字或过度宽泛词**（"第一" "最好" 等日常词会误伤）。

---

## Admin Web 产出

### 新视图（2）

- `views/content-studio/ContentStudioView.vue` · 4 tab 统一工作台：
  - **AI 文案** · 左输入右输出三段卡片 + 实时敏感词标注
  - **AI 标题** · 5 候选带 ctrScore 徽章排序
  - **AI 标签** · 平台选择 + 15 药丸展示
  - **方言适配** · 双窗口前后对比
  - 顶部用量条（本月已用 / 上限 / provider）
- `views/cases/CaseLibraryView.vue` · 6 tab（文案/标题亮；画面/BGM/标签/投放灰掉占位）+ 搜索 + 详情抽屉 + 手动入库弹窗

### 菜单

phase 4 新亮起：**内容生产 · 案例库**。至此，策划日常核心工作路径全通。

---

## 测试

### E2E（`pnpm --filter @mindlink/api test:e2e`）

**55/55 passed** · 5 suites：
- health (1)
- phase1-auth (13)
- phase2-lifecycle (15)
- phase3-contracts (14)
- phase4-ai (12) · 本 phase 新增：
  - copywriting 三段输出
  - titles 5 候选 + ctrScore 降序
  - tags ≤ 15
  - dialect-adapt
  - 敏感词预检 → 422
  - sensitive-check 独立端点不计配额
  - usage 计数器随调用递增
  - cases 官方 + 私库合并
  - callCount 访问后 +1
  - 跨租户 B 的私库 A 看不到
  - teleprompter 切分视频 script

### 全面穿行（`bash scripts/walkthrough.sh`）

**98/98 passed** · 耗时 63 秒。新增 H 段 15 断言，覆盖 AI 文案/标题/标签/方言/敏感词/usage/案例库。

---

## 关键业务规则覆盖

| 规则 | 验证位置 | 结果 |
|---|---|---|
| AI 配额按 plan 硬限（PRD §1.6） | QuotaService + usage 端点 | ✓（超限 429） |
| 敏感词预检 + 后检双保险 | H.5 · e2e | ✓ |
| 方言适配 3 种切换 | H.4 · e2e | ✓ |
| 案例 callCount 记录访问热度 | H.9 · e2e | ✓ |
| 租户私库隔离（B 的案例 A 不可见） | e2e | ✓ |
| 官方库（tenantId=null）对所有租户只读可见 | H.8 | ✓ |
| Provider 可 env 切换不改业务代码 | LlmService.pickProvider | ✓ |

---

## 交接给 Phase 5

### 可用 API

- `LlmService.invoke(promptName, vars, { tenantId, staffId })` · phase 5 月报生成直接用
- `SensitiveService.check()` / `isClean()` · 月报 PDF 导出前可加 post-check
- `GET /ai/usage` · 驾驶舱（phase 6）展示用量
- `/cases/*` · phase 4 起全开

### 可复用后端

- Prompt 在 system 里嵌 `[prompt:name]` 标记，phase 5 写 `monthly-report` / `renewal-proposal` prompt 时沿用
- `LlmUsageLogEntity` 可供 phase 8 做成本账单汇总

### 可复用前端

- `ContentStudioView` 的"左输入 / 右输出 + 顶部用量"模式，phase 5 月报编辑器可继承
- `CaseLibraryView` 的"官方/私库徽章 + callCount 排序"，phase 6 案例复用场景可参考
- 敏感词实时提示组件内联，可抽为 `packages/ui/<SensitiveIndicator>`

---

## 已知问题 / 推迟项

- **真实 LLM provider**：代码已就位，但未在本 phase 切换（仍默认 mock）。phase 8 部署时配置 env 激活
- **AI 分镜可视化**：归 V2（phase-4.md Out-of-Scope）
- **自动剪辑**：归 V2
- **案例库自动回流**：phase 4 只做手动入库，自动规则归 V2
- **官方案例库运营机制**：种子数据是 10 条，phase 8+ 由官方团队持续更新
- **向量搜索**：phase 4 只做关键词 LIKE，pgvector 归 V2
- **老板口播自动剪辑**：不做，phase 7 小程序端仅做提词 + 分段录制（本 phase 后端已就位）

---

## 启动

```bash
# 全量种子（幂等 · 已有跳过）
pnpm --filter @mindlink/api seed:phase-1
pnpm --filter @mindlink/api seed:phase-2
pnpm --filter @mindlink/api seed:phase-3
pnpm --filter @mindlink/api seed:phase-4

pnpm --filter @mindlink/api dev            # :3000
pnpm --filter @mindlink/admin-web dev      # :5173

# 登录 13900000001 / Passw0rd!
# 侧栏新亮：内容生产 · 案例库
# 4 tab 内容生产工作台 + 实时用量条 + 敏感词预警
```

### 切换真实 LLM（phase 8 前可预先试）

```bash
# 通义千问
export LLM_PROVIDER=openai-compat
export LLM_API_KEY=sk-...
export LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
export LLM_MODEL=qwen-turbo

# 或 DeepSeek
export LLM_BASE_URL=https://api.deepseek.com
export LLM_MODEL=deepseek-chat

# 重启 API，内容生产页自动使用真实 provider
```

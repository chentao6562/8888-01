# 阶段交接协议（Handoff Protocol）

> 从 phase N 到 phase N+1 的交接规则。破坏契约需走 ADR。

---

## 1 · 交接触发条件

上游 phase 同时满足以下 3 条才能交接：

1. **文档状态**：该 phase 文档 `status: done`
2. **测试通过**：CI 绿灯（type-check、lint、unit、integration）
3. **交接清单完整**：phase 文档最后一节「交接清单」已填写

---

## 2 · 交接清单内容要求

上游 phase 文档末尾必须产出 5 类信息给下游：

### 2.1 可用 API 清单

列表最多 20 个关键端点，格式：

```markdown
- `POST /api/v1/customers` · 创建客户 · 角色 pm/strategist/admin
- `GET /api/v1/customers/:id` · 客户详情 · 角色 pm/strategist/admin
```

详细 schema 由 Swagger 提供，URL：`/api/docs`

### 2.2 可用数据实体

```markdown
- `Customer`（含 stage = lead/diagnosing/proposing/signed）
- `DiagnosisReport`
- 种子数据位置：`apps/api/src/seeds/phase-2.ts`
```

### 2.3 可复用组件

```markdown
- `packages/ui` 新增：`<DataTable>`、`<StageBadge>`、`<AvatarGroup>`
- `apps/admin-web/src/components/` 新增：`<CustomerPicker>`
- 用法示例：`docs/examples/xxx.md`
```

### 2.4 已知问题

GitHub Issues 链接或本地 `docs/adr/*.md` 链接。必须标明：

- 问题描述
- 影响范围
- 建议处理时机

### 2.5 回归测试用例

留给下游的"不要打破"清单：

```markdown
- 2 家租户隔离（见 `e2e/tenant-isolation.spec.ts`）
- 策划角色看不到财务菜单（见 `e2e/rbac.spec.ts`）
```

---

## 3 · 下游 phase 接手检查

下游 phase 开工前必须逐项确认：

- [ ] 上游所有「交接清单」项已验证可用
- [ ] 运行 `pnpm test` 全部通过
- [ ] 本地能按种子数据复现上游的 happy path demo
- [ ] 本 phase 文档的「输入契约」与上游「输出契约」一一对应

发现不一致 → 发起 **契约异议**（见 §5）。

---

## 4 · ADR（架构决策记录）

### 4.1 何时发起

- 需要破坏上游输出契约
- 需要修改 `docs/shared/*`
- 跨 phase 边界引入新实体 / 新 API
- 技术选型变更（LLM 换供应商、DB 方案调整等）

### 4.2 ADR 模板

`docs/adr/NNNN-短标题.md`：

```markdown
# ADR NNNN · {标题}

- 状态：proposed | accepted | rejected | superseded
- 日期：YYYY-MM-DD
- 提出人：{bot/人}
- 相关 phase：{1, 2, ...}

## 背景

{为什么需要这个决策}

## 决策

{选择了什么}

## 备选

{考虑过的其他方案及为何放弃}

## 影响

- 对代码的影响
- 对契约的影响
- 对其他 phase 的影响

## 动作

- [ ] 更新 docs/shared/xxx.md
- [ ] 通知受影响 phase 的 owner
```

### 4.3 编号

从 `0001` 开始，按时间递增。

---

## 5 · 契约异议流程

下游发现上游契约破损时：

1. 下游 phase status 改为 `blocked`
2. `blockers` 字段填 "与 phase N 契约不一致：{具体点}"
3. 在 `docs/adr/` 开新 ADR，状态 `proposed`
4. 标记上游 phase owner 复核
5. ADR accepted 后 → 上游回到 `in-progress` 修复 → 重走验收 → 下游恢复

---

## 6 · 并行 phase 协作

### 6.1 可并行 phase 对

| 上游 | 并行 phase | 共享依赖 |
|---|---|---|
| 段 3 | 段 4 + 段 5 | 都依赖 Video 实体 |
| 段 5 | 段 7（客户端可提前起步） | 月报 API |

### 6.2 并行冲突仲裁

- `packages/shared` 类型改动 → 先提交的赢，后提交的 rebase + 合并
- 数据库 migration 顺序冲突 → 数字较大者 rebase 到最新

---

## 7 · Commit 与 PR 约定

### 7.1 Commit 消息

```
[P{phase}] {scope}: {subject}

{body 可选}
```

scope 取值：`api` / `web` / `mp` / `shared` / `ui` / `db` / `test` / `docs` / `infra`

示例：
```
[P2] api: add customers CRUD with tenant guard
[P2] web: implement customer detail page per prototype
[P6] docs: extend data-model with HealthScoreSnapshot
```

### 7.2 PR 规则

- PR 标题同 commit 格式
- PR 描述必须包含：
  - 完成的 checklist 项（从 phase 文档复制勾选过的）
  - 新增测试
  - 截图（UI 变更必须）
- 合并前需通过 CI + 至少一次 review（可由另一个 bot 做 review）

---

## 8 · 阶段结束仪式

phase 结束时 owner bot 必须执行：

1. 更新本 phase 文档 `status: done`
2. 更新 `CLAUDE.md` 末尾「最近更新」追加一行
3. 在 `docs/changelog/phase-N.md` 写完工报告（简版）：
   - 完成的功能
   - 未完成 / 推迟的功能
   - 实际工时 vs 预估
   - 经验教训
4. 通知下游 phase owner 可以接手

---

## 9 · Bot 协同的元规则

- **独占性**：一个 phase 同一时刻只有 1 个 owner
- **透明性**：blockers 必须写具体、可执行
- **异步性**：不依赖在线沟通，全靠文档与 ADR
- **可审计**：所有决策留痕（git + ADR + changelog）
- **失败回滚**：失败的 phase 置 `status: todo` 并在 changelog 说明，不直接删除

---

_文档版本_：1.0 · 2026-04-20

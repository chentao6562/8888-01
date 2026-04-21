---
phase: N
title: "阶段 N · 标题"
duration: "X周"
status: todo           # todo | claimed | in-progress | review | done | blocked
owner: ""              # bot 认领时填写
blockers: []           # 被阻塞时填阻塞项
depends-on: []         # 前置 phase 列表，如 [0, 1]
produces: []           # 输出的 paths/modules
last-updated: "YYYY-MM-DD"
---

# 阶段 N · {标题}

## 0 · 一句话目标

> {本阶段做完，系统上出现的可 demo 的那件事}

## 1 · 前置依赖（输入契约）

必须在下列条件满足后才能开工：

- **代码层面**：
  - {上游 phase 产出的代码/模块路径}
  - {必须存在的数据表}
- **契约层面**：
  - {上游 API 名称与 schema 引用}
  - {复用的 shared 契约}
- **环境层面**：
  - {账号 / 密钥 / 第三方服务状态}

如前置未满足 → 把本 phase status 置为 `blocked`，blockers 字段填缺项。

## 2 · 范围

### 2.1 In-Scope

- {本 phase 要实现的能力 1}
- {能力 2}
- ...

### 2.2 Out-of-Scope（明确不做）

- {属于本 phase 业务域但推迟到后续 phase 的功能，注明归属 phase}
- {属于 V2/V3 的功能}

## 3 · 输出契约

### 3.1 新增文件清单

```
apps/api/src/modules/{module}/...
apps/admin-web/src/views/{view}/...
packages/shared/types/{type}.ts
...
```

### 3.2 数据库变更

- 新表：`{table}` · 用途
- 表变更：`{table}` 添加字段 `{field}` · 用途
- 迁移文件：`apps/api/src/migrations/NNNN-xxx.ts`

### 3.3 对外 API

| Method | Path | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/api/v1/xxx` | JWT + role:PM | 创建 xxx |

完整入参/出参见 [API 约定](./shared/api-conventions.md) 风格；必要时在 `apps/api/src/modules/{module}/dto/` 放 Zod schema。

### 3.4 UI 页面

| 路由 | 页面名 | 角色可见 | 原型依据 |
|---|---|---|---|
| `/xxx` | XXX 页 | PM/管理员 | `prototype_extract/xx.html` |

### 3.5 事件与任务

- 新增定时任务：`cron: '0 2 * * *'` · {作用}
- 发出事件：`{event.name}` · 上下文字段

## 4 · 任务清单

按区域拆分，每个 bot 可以拆开认领。

### DB 层

- [ ] {migration 名}
- [ ] 种子数据（可选）

### API 层（NestJS）

- [ ] `{Module}Module` 创建
- [ ] `{Entity}` 实体 + 关系
- [ ] `{Controller}` CRUD 端点
- [ ] `{Service}` 业务逻辑
- [ ] DTO + Zod 校验
- [ ] 单元测试（覆盖率 ≥ 70%）

### Admin Web 层（Vue 3）

- [ ] 路由注册
- [ ] Store（Pinia）
- [ ] 页面组件
- [ ] 表单/表格基础组件复用 `packages/ui`
- [ ] 错误态 / 加载态 / 空态

### 客户端层（uni-app，如涉及）

- [ ] 页面
- [ ] API 调用 wrapper
- [ ] 微信小程序特殊适配

### 共享层

- [ ] `packages/shared` 类型定义
- [ ] 相关常量

## 5 · 数据模型（本 phase 相关部分）

参见 [data-model.md](./shared/data-model.md) 中 `{实体}` 定义。本 phase 涉及的字段：

```typescript
interface XXX {
  id: string;
  tenantId: string;     // 多租户必带
  // ...
}
```

状态机：

```
状态A → 状态B → 状态C
     ↓
  状态异常
```

## 6 · 关键业务规则

- 规则 1（带 PRD 引用，如 PRD §4.7）
- 规则 2

业务规则与 PRD 附录 C 冲突时，以 PRD 为准。

## 7 · 原型视觉约束

- 主页面 {X}：参照 `prototype_extract/{file}.html` **像素级**
- 子页面 {Y}：按 Design Token 自行扩展，保持一致

## 8 · 测试用例最低要求

- [ ] Happy path 端到端
- [ ] 权限拒绝：无权限角色调用 → 403
- [ ] 租户隔离：租户 A 查询 → 看不到租户 B 数据
- [ ] 边界值：空值 / 极长字符串 / 并发
- [ ] 状态机非法跳转拦截

## 9 · 验收标准（Definition of Done）

全部勾选后可以标 `status: done`：

- [ ] 所有任务清单项完成
- [ ] 单元测试 + 集成测试通过
- [ ] Lint / 类型检查零错误
- [ ] 对接的 UI 与原型一致性 review 通过
- [ ] 本文件 "交接清单" 生成交给下游 phase 的资料
- [ ] CLAUDE.md 末尾更新时间戳

## 10 · 交接清单（Handoff to Phase N+1）

下游 phase 可以依赖的：

- **可用 API**：列出 5-10 个最关键的
- **可用数据**：列出关键实体
- **可复用组件**：列出 `packages/ui` 新增组件
- **已知问题**：留给后续 phase 的遗留 issue（链接到 GitHub Issues 或 docs/adr/）

## 11 · 风险与开放问题

- [ ] 待业务决策：{问题}
- [ ] 技术不确定：{问题}

每项需写清楚 "谁 / 什么时候 / 怎样确认"。

---

_模板版本_：1.0 · 2026-04-20

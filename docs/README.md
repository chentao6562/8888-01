# MindLink · 分阶段开发文档

> 本目录是 **机器人协同开发** 的作战指令集。每个 `phase-N-*.md` 文件自包含、可执行，任何 AI agent 读完单文件即可开工。

---

## 阅读顺序

```
1. 项目根 CLAUDE.md                 // 全局索引 + 8 段路径总览
2. docs/shared/*                    // 跨阶段契约（必读，读一次即可）
3. docs/phase-N-*.md                // 当前分配到的阶段
4. MindLink_PRD_v1.docx / prd_text.txt  // 需要业务细节时按章节查
5. prototype_extract/*.html         // 需要视觉细节时看对应原型
```

---

## 目录结构

```
docs/
├── README.md                       // 本文件
├── shared/
│   ├── doc-template.md             // 阶段文档统一模板（写新阶段时套用）
│   ├── data-model.md               // 全系统数据实体与状态机
│   ├── api-conventions.md          // REST API 约定 + 鉴权 + 错误码
│   ├── design-tokens.md            // 从原型抽取的设计变量
│   └── handoff-protocol.md         // 阶段间交接协议
├── phase-0-foundation.md           // 工程基建（1.5w）
├── phase-1-tenant-auth.md          // 多租户鉴权（1.5w）
├── phase-2-clm-s1-s3.md            // 线索·诊断·方案（2w）
├── phase-3-contract-delivery.md    // 合同·交付·任务（2w）
├── phase-4-ai-content.md           // AI 内容生产（1.5w）
├── phase-5-data-monthly.md         // 数据·月报·健康度（1.5w）
├── phase-6-renewal-dashboard.md    // 续约·驾驶舱（1.5w）
├── phase-7-mini-program.md         // 小程序客户端（2w）
└── phase-8-integration-beta.md     // 集成·Beta（1.5w）
```

---

## 阶段依赖图

```
           段0 基建
              │
           段1 租户+鉴权
              │
           段2 CLM(S1-S3)
              │
           段3 合同+交付
            ┌─┴─┐
         段4 AI  段5 数据月报
         内容      │
            └─┬───┘
              │
           段6 续约+驾驶舱
              │
           段7 小程序客户端
              │
           段8 集成+Beta
```

**并行机会**：段 4 和段 5 可并行（两个 bot 同时干）；段 7 可在段 5 完成后提前起步。

---

## 协同规则（多 bot 必读）

### 1. 谁在干什么：status 字段
每个阶段文档顶部 YAML frontmatter 含 `status`，取值：
- `todo` · 未开工
- `claimed` · 已被某 bot 认领（写入 `owner` 字段）
- `in-progress` · 开发中
- `review` · 待验收
- `done` · 已完成
- `blocked` · 被阻塞（写 `blockers` 字段）

bot 开工前先把 status 从 `todo` 改为 `claimed`，并填写 owner。

### 2. 边界锁
- 每个 bot 只能修改分到的 phase 范围内的文件（见该 phase 的 "输出契约 · 文件清单"）
- 跨 phase 修改必须走 **ADR**（Architecture Decision Record），写到 `docs/adr/NNNN-题目.md`
- `docs/shared/*` 只允许原设计者或经协商后修改，修改同时在 CLAUDE.md 追加"最近更新"

### 3. 契约先行
- 上游 phase 的 "输出契约" 一旦被下游引用，**不可破坏**；必须改时发起 ADR
- 下游 phase 的 "输入契约" 必须 100% 来自上游 phase 的 "输出契约"，不能凭空新增

### 4. 验收门禁
每 phase 末尾的"验收标准"是该 phase 完工的唯一判据。不通过不得标 `done`。

### 5. 提交粒度
- 每完成一项 checklist 即提交一次，commit message 格式：`[P{phase}] {area}: {desc}`
  - 例：`[P2] api: add /customers CRUD`
  - 例：`[P2] web: restore customers list per prototype`

---

## 快速导航

| 我要做… | 打开… |
|---|---|
| 新起一个阶段文档 | `docs/shared/doc-template.md` 复制 |
| 查某实体的字段 | `docs/shared/data-model.md` |
| 设计新 API | `docs/shared/api-conventions.md` |
| 找颜色/间距 | `docs/shared/design-tokens.md` |
| phase 交接 | `docs/shared/handoff-protocol.md` |
| 查具体功能需求 | `prd_text.txt` 按章节搜索 |
| 查页面视觉 | `prototype_extract/*.html` |

_最近更新_：2026-04-20 · 初版

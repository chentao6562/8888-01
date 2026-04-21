---
phase: 0
title: "工程基建"
duration: "1.5周"
status: done
owner: "claude-sonnet-opus-4-7"
blockers: []
depends-on: []
produces:
  - apps/admin-web
  - apps/client-mp
  - apps/api
  - packages/ui
  - packages/shared
  - packages/config
  - docker-compose.yml
  - turbo.json
  - pnpm-workspace.yaml
last-updated: "2026-04-20"
---

# 阶段 0 · 工程基建

## 0 · 一句话目标

> 所有后续 phase 可在本地 `pnpm dev` 一键启动 Web 管理端 + 小程序预览 + NestJS API + Postgres + Redis，登录页能打开。

## 1 · 前置依赖

- **本地环境**：Node.js 20+ · pnpm 9+ · Docker Desktop · WeChat DevTools（小程序预览）
- **账号**：GitHub 仓库、腾讯云 / 阿里云二选一（段 8 才需要，段 0 仅记录规划）
- **无上游 phase 依赖**

## 2 · 范围

### 2.1 In-Scope

- Monorepo 初始化（pnpm workspace + Turborepo）
- 三端脚手架：Web 管理端 (Vue 3)、小程序 (uni-app)、后端 (NestJS)
- 共享包：`packages/ui` Design Token、`packages/shared` DTO 类型、`packages/config` Lint/TS/Prettier
- 本地 Docker 环境：Postgres 16 + Redis 7 + MinIO（OSS 替身）
- 基础 UI 组件（Button / Card / Table / Form / Modal）按 Design Token 实现
- Git 工作流：husky pre-commit + commitlint
- CI：GitHub Actions 跑 type-check + lint + build + unit test
- 环境变量模板 `.env.example`

### 2.2 Out-of-Scope

- 业务功能（归 phase 2+）
- 租户 / 鉴权（归 phase 1）
- 生产部署（归 phase 8）

## 3 · 输出契约

### 3.1 新增文件清单

```
/pnpm-workspace.yaml
/turbo.json
/package.json                      (monorepo root)
/.gitignore
/.editorconfig
/.env.example
/docker-compose.yml
/.github/workflows/ci.yml
/.husky/pre-commit
/commitlint.config.cjs

apps/admin-web/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── index.html
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/index.ts
│   ├── stores/index.ts
│   ├── api/http.ts               // axios 实例（参考 api-conventions §15.1）
│   ├── layouts/
│   │   ├── DefaultLayout.vue     // 侧栏 + 主内容
│   │   └── AuthLayout.vue        // 登录页用
│   ├── views/
│   │   └── LoginView.vue         // phase 0 仅占位
│   └── styles/
│       └── main.css
└── public/

apps/client-mp/
├── package.json
├── vite.config.ts                // uni-app
├── manifest.json                 // 微信小程序 appid 占位
├── pages.json
├── src/
│   ├── App.vue
│   ├── main.ts
│   ├── pages/
│   │   └── index/index.vue       // 占位首页
│   └── uni.scss
└── tsconfig.json

apps/api/
├── package.json
├── tsconfig.json
├── nest-cli.json
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/                   // env 读取
│   ├── common/
│   │   ├── filters/all-exception.filter.ts
│   │   ├── interceptors/transform.interceptor.ts
│   │   └── pipes/zod-validation.pipe.ts
│   ├── modules/
│   │   └── health/health.controller.ts   // GET /health → 200
│   └── database/
│       ├── data-source.ts
│       └── migrations/
└── test/
    └── health.e2e-spec.ts

packages/ui/
├── package.json
├── src/
│   ├── tokens.ts                 // Design Token 常量
│   ├── components/
│   │   ├── Button.vue
│   │   ├── Card.vue
│   │   ├── DataTable.vue
│   │   ├── FormField.vue
│   │   ├── Modal.vue
│   │   └── StatusTag.vue
│   └── index.ts

packages/shared/
├── package.json
├── src/
│   ├── types/
│   │   ├── common.ts             // BaseEntity、Pagination
│   │   └── index.ts
│   ├── constants/
│   │   └── enums.ts              // StaffRole、CustomerStage 等字符串常量
│   └── index.ts

packages/config/
├── eslint-preset.cjs
├── prettier-preset.cjs
├── tsconfig.base.json
└── package.json
```

### 3.2 数据库变更

- 无业务表
- 仅初始化 `migrations` 目录 + 一个空 migration `0000-init.ts`

### 3.3 对外 API

仅有健康检查：

| Method | Path | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/api/v1/health` | 无 | 返回 `{ status: 'ok', ts: iso }` |

### 3.4 UI 页面

| 路由 | 页面 | 状态 |
|---|---|---|
| `/login` | LoginView（空壳） | 占位，phase 1 实装 |

### 3.5 事件与任务

无

## 4 · 任务清单

### Infra

- [ ] `pnpm init` + `pnpm-workspace.yaml` 声明三端
- [ ] `turbo.json` 定义 pipeline: `build`, `dev`, `test`, `lint`, `type-check`
- [ ] `docker-compose.yml`：postgres:16、redis:7、minio:latest 本地起来
- [ ] `.env.example` 列所有环境变量键
- [ ] `.github/workflows/ci.yml`：push/PR 触发 type-check + lint + build

### Admin Web

- [ ] `pnpm create vue@latest` 初始化，选 TS + Router + Pinia
- [ ] 集成 Tailwind（`tailwind.config.ts` 引 `packages/ui` design tokens）
- [ ] 装 axios，配置 `src/api/http.ts`（参见 API 约定 §15.1）
- [ ] `DefaultLayout` + `AuthLayout` 两套布局
- [ ] `LoginView.vue` 空壳（带原型深色风格，phase 1 接逻辑）
- [ ] 路由守卫占位（phase 1 接 token 判断）
- [ ] 引 `lucide-vue-next` 图标库

### Client MP

- [ ] `pnpm create uni-app` 初始化，Vue 3 + TS
- [ ] 配 uni.scss 与 design tokens 对齐
- [ ] `pages.json` 定 5 个 Tab 占位（首页/内容/数据/合同/我的）
- [ ] `pages/index/index.vue` 占位首页（显示 "Hello MindLink"）
- [ ] 微信开发者工具打开可预览

### API

- [ ] `pnpm dlx @nestjs/cli new apps/api`（手动调整到 monorepo 结构）
- [ ] 装 TypeORM + pg 驱动 + @nestjs/config
- [ ] `DataSource` 连接配置从 env 读
- [ ] 全局异常过滤器 + 响应拦截器（符合 API 约定 §4.4 的响应结构）
- [ ] `nestjs-zod` 集成，默认 validation pipe
- [ ] `HealthModule` 提供 `/api/v1/health`
- [ ] `@nestjs/swagger` 启用 `/api/docs`
- [ ] 数据库连接启动时自动连
- [ ] e2e 测试框架 Jest + Supertest：`GET /api/v1/health` 返回 200

### Packages · UI

- [ ] `tokens.ts` 按 design-tokens.md §10 导出
- [ ] 6 基础组件（见上 3.1）按原型风格实现
- [ ] Storybook 可选（MVP 不强制）

### Packages · Shared

- [ ] `BaseEntity` 接口
- [ ] `Pagination` 类型
- [ ] `CustomerStage` / `StaffRole` 枚举字符串常量

### Packages · Config

- [ ] ESLint：Vue 3 + TS + typescript-eslint + prettier
- [ ] Prettier：100 列、单引号、无分号、trailing comma
- [ ] `tsconfig.base.json` strict 开到最严

### Git 工作流

- [ ] Husky 装 pre-commit：`lint-staged` 跑 eslint + prettier
- [ ] commitlint + conventional commits（但本项目额外要求 `[P{N}]` 前缀，见 handoff-protocol §7.1）
- [ ] `.gitignore`：node_modules、dist、.env、.DS_Store

## 5 · 数据模型

无业务实体。仅配置 TypeORM `DataSource` 指向 postgres。

## 6 · 关键业务规则

无业务规则，本 phase 只设工程规则：

- 所有 PR 必过 CI
- Commit 必须 `[P0]` 前缀
- `packages/shared` 的导出必须被三端共用（任何端新增类型考虑是否放 shared）

## 7 · 原型视觉约束

- `LoginView.vue` 采用深蓝背景 + `navy` 卡片（参考 `prototype_extract/01_dashboard.html` 侧栏配色基调），具体视觉在 phase 1 完成表单时确定
- `packages/ui` 6 组件按 design-tokens.md 开发

## 8 · 测试用例最低要求

- [ ] `GET /api/v1/health` 返回 `{ data: { status: 'ok', ts: ... } }` + 200
- [ ] 三端均能 `pnpm build` 成功
- [ ] `pnpm dev` 启动后访问 `http://localhost:5173` 出现登录页占位
- [ ] `pnpm lint` 零 error

## 9 · 验收标准（Definition of Done）

- [ ] 克隆仓库后只跑两行命令即可开工：
      ```
      cp .env.example .env
      docker compose up -d && pnpm install && pnpm dev
      ```
- [ ] Admin Web 能打开 `/login` 页面，页面使用 Tailwind + Design Token
- [ ] 小程序在微信开发者工具里能预览
- [ ] API 的 `/api/v1/health` + `/api/docs` 都能访问
- [ ] CI workflow 首次跑成功（绿灯）
- [ ] 6 个基础 UI 组件可被 admin-web import 渲染
- [ ] 所有 phase 文档中的路径可正确存在
- [ ] CLAUDE.md 末尾追加"最近更新"记录

## 10 · 交接清单（Handoff to Phase 1）

### 可用 API

- `GET /api/v1/health` — 健康检查

### 可用数据

无业务数据。种子框架 `apps/api/src/seeds/` 目录占位。

### 可复用组件

- `@mindlink/ui`：`<Button>`、`<Card>`、`<DataTable>`、`<FormField>`、`<Modal>`、`<StatusTag>`
- `@mindlink/shared`：`BaseEntity`、`Pagination`、`StaffRole`、`CustomerStage` 类型与常量
- `@mindlink/config`：ESLint / Prettier / TS 预设

### 已知问题

- 小程序微信 AppId 先用 `wx-placeholder`，phase 7 替换
- MinIO 本地可用，腾讯云 COS 接入推迟到 phase 3（视频上传）

### 回归测试

- `pnpm test` 跑过 `health.e2e-spec.ts`
- `pnpm build` 三端全绿

## 11 · 风险与开放问题

- [ ] 待决策：微信小程序 AppId 申请时机（建议 phase 7 前申请）— 决策人：CC
- [ ] 技术不确定：Turborepo vs Nx — 当前选 Turborepo（更轻），如有问题 ADR 切换

---

_文档版本_：1.0 · 2026-04-20

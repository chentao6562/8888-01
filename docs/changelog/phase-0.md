# Phase 0 · 工程基建 · 完工报告

**完工时间**：2026-04-20
**owner**：claude-opus-4-7

## 实际产出

### 仓库结构

```
代运营协同系统/
├── apps/
│   ├── admin-web/      Vue 3 + Vite + TS + Tailwind + Pinia + Router
│   ├── client-mp/      uni-app (Vue 3 + TS) 微信小程序 + H5
│   └── api/            NestJS 10 + TypeORM 数据源占位 + Swagger
├── packages/
│   ├── ui/             Design Token + 6 基础组件
│   ├── shared/         BaseEntity/Pagination/枚举/PRD 常量
│   └── config/         ESLint/Prettier/TS base 预设
├── .github/workflows/ci.yml   type-check + lint + build + test
├── .husky/             pre-commit + commit-msg
├── docker-compose.yml  Postgres 16 + Redis 7 + MinIO
├── turbo.json
├── pnpm-workspace.yaml
└── package.json        (pnpm 9.15.0, node >=20.11)
```

### 验证通过

| 项 | 结果 |
|---|---|
| `pnpm install` | ✓ 依赖装齐（2m 2s） |
| `pnpm --filter @mindlink/api build` | ✓ nest build 成功 |
| `pnpm --filter @mindlink/api test` | ✓ 1 unit test 通过 |
| `pnpm --filter @mindlink/api test:e2e` | ✓ `/api/v1/health` e2e 通过 |
| `pnpm --filter @mindlink/admin-web build` | ✓ vite build 3.8s |
| `pnpm --filter '!@mindlink/client-mp' type-check` | ✓ 5 个 workspace 全通过 |
| API 冒烟 `curl /api/v1/health` | ✓ `{"data":{"status":"ok","ts":"..."}}` |
| API 冒烟 `curl /api/docs` | ✓ Swagger 200 |
| admin-web Vite dev 5173 | ✓ HTTP 200 · HTML 返回正确 |

### 与计划的差异

- **Docker** 未在本机验证（环境无 Docker），docker-compose.yml 已就位，用户自行安装后可起
- **Husky pre-commit** 已写，但 `prepare: .git can't be found` 因仓库未 `git init`，用户 `git init` 后自动生效
- **class-validator / class-transformer** 在接 e2e 测试时补装（Nest ValidationPipe 需要）
- **admin-web build 脚本**：`vue-tsc -b` 会试图写 `.d.ts` 覆盖源文件，改为 `vue-tsc --noEmit -p tsconfig.json`
- **packages/ui tsconfig**：移除 `types: ["vite/client"]`（无 vite dep），加 `noEmit: true`
- **apps/api tsconfig**：加 `exclude: ["src/**/*.spec.ts"]`，spec 文件不进 dist

### 微信小程序说明

`@mindlink/client-mp` 的依赖已装齐（uni-app 3.0.0-4060620250520001）。
真机预览需：
1. 下载 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. `pnpm --filter @mindlink/client-mp build:mp` 产出 `unpackage/dist/build/mp-weixin/`
3. 开发者工具"导入项目"指向该目录
4. 当前 appid 占位 `wx-placeholder`，phase 7 替换为真实 appid

### 已知 Peer Warning（不阻塞）

- `@dcloudio/uni-automator` 期待 jest@27 · 实装 29（unit test 不用 uni-automator，忽略）
- `vue-router@4.6` 期待 vue@^3.5 · uni-app 固定 vue@3.4.21（小程序端生态限制，忽略）

## 下一步

Phase 1 · 多租户 + 鉴权 + 基础权限 可以开工。详见 [phase-1-tenant-auth.md](../phase-1-tenant-auth.md)。

## 启动命令

```bash
# 安装依赖（一次）
pnpm install

# 启动后端（需先起 docker compose 或忽略 DB，phase 0 无实体依赖）
pnpm --filter @mindlink/api dev

# 启动管理端（新终端）
pnpm --filter @mindlink/admin-web dev

# 启动小程序 H5 预览（新终端，需微信开发者工具支持小程序模式）
pnpm --filter @mindlink/client-mp dev:mp

# 一键全部 build
pnpm build

# 一键全部测试
pnpm test
```

访问：
- 管理端：http://localhost:5173
- API：http://localhost:3000/api/v1/health
- API 文档：http://localhost:3000/api/docs

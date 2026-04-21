# Phase 1 · 多租户 + 鉴权 + 基础权限 · 完工报告

**完工时间**：2026-04-20
**owner**：claude-opus-4-7

## 实际产出

### API (NestJS)

- **实体**：`UserEntity` · `TenantEntity` · `StaffEntity` · `AuditLogEntity`
- **模块**：`users` · `tenants` · `staff` · `auth` · `audit`（全局）
- **鉴权**：
  - JWT（access 1h / refresh 30d 可配）
  - bcrypt(10) 密码哈希
  - Passport `jwt` strategy + 全局 `JwtAuthGuard`（支持 `@Public()`）
  - `RolesGuard` + `@Roles(...)`
  - `TenantGuard` + `@CurrentUser()` / `@CurrentTenant()`
- **功能端点**（12 个）：
  - `POST /api/v1/auth/register-tenant` · 注册公司 + 默认管理员（事务原子）
  - `POST /api/v1/auth/login` · 手机 + 密码
  - `POST /api/v1/auth/refresh` · 刷新 access token
  - `POST /api/v1/auth/accept-invite` · 接受邀请 + 设密 + 自动登录
  - `POST /api/v1/auth/logout`（stateless，埋点用）
  - `GET /api/v1/auth/me` · 当前上下文（user/staff/tenant 快照）
  - `GET /api/v1/tenants/current` · 当前租户
  - `PATCH /api/v1/tenants/current` · 管理员编辑（name/logo/contact）
  - `GET /api/v1/staff` · 员工列表（admin/pm）
  - `POST /api/v1/staff/invite` · 邀请员工（admin）· 返回邀请链接（mock console.log）
  - `PATCH /api/v1/staff/:id` · 改角色/状态（admin）
  - `DELETE /api/v1/staff/:id` · 删员工（admin，owner 不可删）
- **安全**：
  - 密码强度校验（≥8 位 + 字母 + 数字，DTO Zod-like）
  - 5 次错密码锁 30 分钟
  - 禁用员工即时失效（JwtStrategy.validate 每次查一次）
  - 租户档位限员工数（basic 5 / pro 20 / enterprise 50）
  - 所有关键动作审计日志

### Admin Web (Vue 3 + Pinia + Router)

- **Store**：`auth.store.ts`（token/refresh/user 持久化 localStorage）
- **菜单配置**：`config/menu.ts` · 按角色过滤 · phase 1 激活「员工管理」「公司设置」
- **路由守卫**：`router/guards` · 未登录重定向 · 角色不符重定向 · 标题动态设置
- **视图**：
  - `views/auth/LoginView.vue` · 手机 + 密码
  - `views/auth/RegisterView.vue` · 两步表单（公司 + 管理员）
  - `views/auth/ForgotPasswordView.vue` · 占位说明
  - `views/auth/AcceptInviteView.vue` · 从 URL 取 token，设密 + 自动登录
  - `views/HomeView.vue` · 登录后着陆页 · 展示 /me 快照
  - `views/staff/StaffListView.vue` · 员工表格（启用/禁用/移除）
  - `views/staff/StaffInviteModal.vue` · 邀请表单
  - `views/tenant/TenantSettingsView.vue` · 公司信息编辑
- **Layout**：`DefaultLayout.vue` · 侧栏按角色渲染菜单 + 退出登录

### 数据库

- **dev/test**：SQLite（`better-sqlite3`，零依赖，`pnpm dev` 即可跑）
- **prod**：Postgres（通过 `DB_DRIVER=postgres` 或 `NODE_ENV=production` 切换）
- `synchronize: true` 用于 dev，phase 8 前引入真实 migrations

### 种子

`pnpm --filter @mindlink/api seed:phase-1` 生成：
- 租户 A：呼市老彭代运营（pro）· admin/pm/strategist 各 1
- 租户 B：包头新媒体（basic）· admin/creator/adops 各 1
- 统一密码：**Passw0rd!**
- 手机号：租户 A 用 `1390000000[1-3]`，租户 B 用 `13900001[01-03]`

## 验证通过

### 单测 + e2e（`pnpm --filter @mindlink/api test:e2e`）

**15/15 passed**：
1. ✓ health is public
2. ✓ unauthenticated → 401
3. ✓ register tenant A / B
4. ✓ 同手机号重复注册 → 400 USER_PHONE_TAKEN
5. ✓ 弱密码 → 400
6. ✓ 租户隔离（A 只看 A，B 只看 B staff）
7. ✓ 邀请 → accept → 登录 → 拿到 strategist token
8. ✓ 邀请 token 不可重复使用
9. ✓ RBAC · 策划不能邀请员工 → 403
10. ✓ 登录密码错误 → 401
11. ✓ 连续 5 次错密码 → 账号锁定

### 端到端冒烟（真实 HTTP）

- ✓ 注册 A 公司 → 拿到 access/refresh token
- ✓ `GET /auth/me` 返回 admin + 租户 pro + maxStaff 20
- ✓ 邀请 strategist → 拿到 inviteToken (48 hex)
- ✓ 策划接受邀请 → 拿到新 session
- ✓ 员工列表 admin 可见 2 人（admin+strategist）
- ✓ 员工列表策划请求 → 403 FORBIDDEN（需要 admin/pm）
- ✓ 策划尝试邀请 → 403 FORBIDDEN（需要 admin）
- ✓ Refresh token 换 access token 成功

### 构建

- `pnpm --filter @mindlink/api build` ✓
- `pnpm --filter @mindlink/admin-web build` ✓

## 交接给 Phase 2

### 可用 API

- 完整 `/api/v1/auth/*`、`/api/v1/tenants/current`、`/api/v1/staff`
- 所有端点通过 `Authorization: Bearer <token>` 鉴权
- 全局 `JwtAuthGuard` + `@Public()` 豁免

### 可用装饰器 / Guards（phase 2 直接用）

- `@Public()` · `@Roles('admin', 'pm', ...)` · `@CurrentUser()` · `@CurrentTenant()`
- `TenantGuard` · `RolesGuard`（在 controller 层 `@UseGuards(TenantGuard, RolesGuard)`）
- Service 层查询传入 `tenantId` 参数强制过滤

### 可用数据

- `Tenant` · `Staff` · `User` · `AuditLog` 实体
- 种子：2 租户 × 3 员工 = 6 账号

### 可复用前端

- `useAuthStore()` · 任何 phase 2+ 页面可直接读 `auth.currentUser`
- 菜单 `config/menu.ts` · 新 phase 往 items 加一项并指定 `roles` 即可
- 视图 `api/http.ts` · axios 拦截器已含 token 注入 + 401 自动跳登录

## 已知问题 / 推迟项

- **短信服务**：邀请链接用 `console.log` 模拟 + 响应体返回。phase 8 接真实短信
- **订阅档位**：硬编码，超员工上限阻塞邀请。V2 做计费
- **2FA**：未做。如 beta 用户需要，插入 phase 8
- **管理员交接**：owner 不可被删除。V2 支持交接
- **migration**：dev 用 `synchronize: true`，phase 8 引入真实 migrations

## 启动

```bash
# 1. 建库 + 种子（一次）
pnpm --filter @mindlink/api seed:phase-1

# 2. 启 API
pnpm --filter @mindlink/api dev

# 3. 启管理端（新终端）
pnpm --filter @mindlink/admin-web dev

# 4. 打开 http://localhost:5173
#    用种子账号登录：13900000001 / Passw0rd!
```

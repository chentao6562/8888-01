---
phase: 1
title: "多租户 + 鉴权 + 基础权限"
duration: "1.5周"
status: done
owner: "claude-opus-4-7"
blockers: []
depends-on: [0]
produces:
  - apps/api/src/modules/auth
  - apps/api/src/modules/tenants
  - apps/api/src/modules/staff
  - apps/api/src/common/guards
  - apps/admin-web/src/views/auth
  - apps/admin-web/src/views/staff
last-updated: "2026-04-20"
---

# 阶段 1 · 多租户 + 鉴权 + 基础权限

## 0 · 一句话目标

> 两家代运营公司各自注册 → 各自邀请员工 → 不同角色登录看到不同菜单，租户之间数据零泄漏。

## 1 · 前置依赖

- **phase 0 · done**
- `@mindlink/ui` 基础组件可用
- `@mindlink/shared` 的 `StaffRole` 常量存在
- PostgreSQL + Redis 本地跑起来
- API 骨架 + Swagger 可用

## 2 · 范围

### 2.1 In-Scope

- 租户（Tenant）与员工（Staff）实体，含用户认证表
- 租户 onboarding 流程：注册公司 → 选档位（硬编码 basic/pro/enterprise）→ 创建租户 + 默认 admin 员工
- JWT 登录（含 Refresh Token 双 token 模式）
- 6 角色 + 权限矩阵（PRD §2.2）落 DB 并在中间件生效
- `TenantGuard` · `RolesGuard` · `OwnershipGuard`
- 员工管理：邀请（短信/邮件链接）、编辑角色、禁用
- 登录 / 注册 / 忘记密码 Web 页
- 顶部导航 + 侧栏（按角色动态渲染菜单）
- 登出与 token 刷新

### 2.2 Out-of-Scope

- 订阅计费闭环（归 V2）— 本 phase 只硬编码档位
- 客户端（小程序）登录 — 归 phase 7
- SSO / 微信扫码登录 — 归 V2
- 第三方短信服务实装 — 本 phase 用 mock `console.log` 验证码

## 3 · 输出契约

### 3.1 新增文件清单

```
apps/api/src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── dto/
│   │   │   ├── register-tenant.dto.ts
│   │   │   ├── login.dto.ts
│   │   │   └── refresh.dto.ts
│   │   └── strategies/jwt.strategy.ts
│   ├── tenants/
│   │   ├── tenants.controller.ts
│   │   ├── tenants.service.ts
│   │   ├── tenants.module.ts
│   │   └── entities/tenant.entity.ts
│   ├── staff/
│   │   ├── staff.controller.ts
│   │   ├── staff.service.ts
│   │   ├── staff.module.ts
│   │   ├── dto/{invite,update-role,list}.dto.ts
│   │   └── entities/staff.entity.ts
│   └── users/
│       ├── users.service.ts
│       └── entities/user.entity.ts
├── common/
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   ├── tenant.guard.ts
│   │   ├── roles.guard.ts
│   │   └── ownership.guard.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── current-tenant.decorator.ts
│   │   ├── roles.decorator.ts
│   │   └── public.decorator.ts
│   └── middleware/
│       └── tenant-context.middleware.ts
├── migrations/
│   ├── 0001-users.ts
│   ├── 0002-tenants.ts
│   ├── 0003-staff.ts
│   └── 0004-permissions.ts
└── seeds/
    └── phase-1.ts

apps/admin-web/src/
├── views/auth/
│   ├── RegisterView.vue
│   ├── LoginView.vue
│   └── ForgotPasswordView.vue
├── views/staff/
│   ├── StaffListView.vue
│   └── StaffInviteModal.vue
├── stores/
│   ├── auth.store.ts            // token + 当前用户
│   └── menu.store.ts            // 按角色过滤的菜单
├── router/
│   ├── index.ts
│   └── guards.ts                // beforeEach token 判断 + 权限
└── config/
    └── menu.ts                  // 完整菜单 + 每项 allowedRoles

packages/shared/src/
├── types/
│   ├── auth.ts                  // LoginResponse、JwtPayload
│   ├── tenant.ts
│   └── staff.ts
└── constants/
    └── permissions.ts           // 权限矩阵（PRD §2.2 的数字化）
```

### 3.2 数据库变更

- `users`（认证用，无 tenant_id）：id, phone (唯一), password_hash, email, status, last_login_at, created_at
- `tenants`：见 data-model §2.1
- `staff`：见 data-model §2.2
- `permissions`：role + resource + action（多行数据）
- `audit_logs`：初始框架（登录事件就开始记）

### 3.3 对外 API

| Method | Path | 鉴权 | 说明 | Role |
|---|---|---|---|---|
| POST | `/api/v1/auth/register-tenant` | 无 | 注册公司 + 默认管理员 | public |
| POST | `/api/v1/auth/login` | 无 | 手机 + 密码登录 | public |
| POST | `/api/v1/auth/refresh` | 无（带 refresh token） | 刷新 access token | public |
| POST | `/api/v1/auth/logout` | JWT | 登出 | any |
| POST | `/api/v1/auth/forgot-password` | 无 | 发送重置验证码 | public |
| POST | `/api/v1/auth/reset-password` | 无 | 通过验证码重置 | public |
| GET | `/api/v1/auth/me` | JWT | 当前用户信息 | any |
| GET | `/api/v1/tenants/current` | JWT | 当前租户信息 | any |
| PATCH | `/api/v1/tenants/current` | JWT | 更新公司基础信息 | admin |
| GET | `/api/v1/staff` | JWT | 员工列表 | admin/pm |
| POST | `/api/v1/staff/invite` | JWT | 邀请员工（手机或邮件） | admin |
| PATCH | `/api/v1/staff/:id` | JWT | 改角色 / 禁用 | admin |
| DELETE | `/api/v1/staff/:id` | JWT | 离职 | admin |
| POST | `/api/v1/staff/accept-invite` | 无（token in query） | 受邀人设置密码 | public |

### 3.4 UI 页面

| 路由 | 页面 | 可见角色 | 原型依据 |
|---|---|---|---|
| `/register` | 注册公司 | 未登录 | 自设计（贴合品牌深蓝） |
| `/login` | 登录 | 未登录 | 自设计 |
| `/forgot` | 忘记密码 | 未登录 | 自设计 |
| `/accept-invite` | 接受邀请（设密码） | 未登录 | 自设计 |
| `/staff` | 员工管理 | admin | 参考 `02_customers.html` 表格风格 |

### 3.5 事件与任务

- 定时任务：每天 02:00 清理过期的 refresh token
- 审计事件：`auth.login`、`auth.logout`、`auth.login_failed`、`staff.invited`、`staff.role_changed`、`staff.disabled`

## 4 · 任务清单

### DB

- [ ] migration `0001-users.ts`（认证表）
- [ ] migration `0002-tenants.ts`
- [ ] migration `0003-staff.ts`（含 `user_id` FK）
- [ ] migration `0004-permissions.ts`（seed 6 角色的权限矩阵）
- [ ] seed `phase-1.ts`：创建 2 个租户 + 每租户 1 管理员 + 2 员工

### API

- [ ] `UsersService`：密码 bcrypt 哈希，手机号唯一约束
- [ ] `AuthService`：
  - `registerTenant(dto)` → 事务中创建 tenant + user + staff(admin)
  - `login(phone, pwd)` → 签发 access (1h) + refresh (30d)
  - `refresh(refreshToken)` → 新 access token
  - `acceptInvite(token, pwd)` → 新 user + bind staff
- [ ] `JwtStrategy` 从 Authorization header 解析
- [ ] `AuthGuard`：全局默认开启，`@Public()` 豁免
- [ ] `TenantGuard`：从 JWT 提取 tenantId 注入 `req`
- [ ] `RolesGuard`：`@Roles('admin')` 装饰器拦截
- [ ] `OwnershipGuard`（基础版）：PM 只能操作 `pmId = self` 的资源
- [ ] `TenantsController`：current 查询 + 更新
- [ ] `StaffController`：CRUD + invite + accept-invite
- [ ] 邀请短信/邮件 mock 实现（console.log 打印链接）
- [ ] Swagger 文档补齐所有端点

### Admin Web

- [ ] `auth.store.ts`：token 持久化 localStorage + refresh 逻辑
- [ ] `menu.store.ts`：加载完整菜单 → 过滤当前角色可见
- [ ] `router/guards.ts`：未登录重定向 `/login`；已登录访问 `/login` 跳 `/dashboard`
- [ ] `RegisterView.vue`：两步表单（公司信息 + 管理员信息）
- [ ] `LoginView.vue`：手机 + 密码 + 忘记密码链接
- [ ] `ForgotPasswordView.vue`：短信验证码 + 新密码
- [ ] `AcceptInviteView.vue`：从 URL 取 token，设密码后自动登录
- [ ] `StaffListView.vue`：员工表格（姓名/手机/角色/状态/操作）
- [ ] `StaffInviteModal.vue`：邀请表单（手机号 + 角色下拉）
- [ ] 侧栏根据角色渲染菜单（phase 2+ 新增的菜单项在此注册时带 `allowedRoles`）
- [ ] 全局错误 toast（401 自动跳登录）

### Shared

- [ ] `LoginResponse`、`JwtPayload`、`TenantInfo`、`StaffInfo` 类型
- [ ] `PERMISSIONS` 常量（PRD §2.2 数字化）

## 5 · 数据模型（本 phase 相关）

详见 [data-model.md](./shared/data-model.md) §2.1 `Tenant`、§2.2 `Staff`。

本 phase 新增 `users` 认证表（非业务实体，不进 data-model.md 主体，记在这里）：

```typescript
interface User {
  id: string;
  phone: string;              // 唯一
  passwordHash: string;
  email: string | null;
  status: 'active' | 'locked';
  lastLoginAt: Date | null;
  createdAt: Date;
}
```

State machine：`User.status`: `active ↔ locked`（5 次错误密码锁定）

## 6 · 关键业务规则

- **租户隔离**：所有后续 phase 的 Service 查询必须经 `TenantQueryBuilder.withTenant(tenantId)`
- **权限矩阵**（PRD §2.2）：
  - 策划：看不到财务
  - PM：看不到订阅/管理菜单
  - 创作者 / 投手：仅看"我的任务" + 执行相关
  - 管理员：全部
- **租户档位限制**：basic 最多 5 员工；pro 20；enterprise 50（硬编码 MVP 阶段）
- **密码策略**：最少 8 位 + 数字 + 字母；bcrypt cost 10
- **Token 策略**：access 1h；refresh 30d 可滑动
- **登录限流**：同手机号 5 分钟 5 次失败 → 锁 30 分钟
- **邀请 token**：有效期 7 天，单次使用

## 7 · 原型视觉约束

- 登录 / 注册页：深蓝 navy 渐变背景 + 白色卡片中心布局，logo 风格参考 `01_dashboard.html` 左上角
- 员工列表：参考 `02_customers.html` 的表格样式（表头浅灰、行高 56、hover 变浅）
- 侧栏菜单：严格按 `01_dashboard.html` 左侧导航（深色背景、选中态 cyan 左边框）

## 8 · 测试用例最低要求

- [ ] 注册 2 家公司，用户 A 查不到公司 B 任何数据（`TenantGuard` e2e）
- [ ] 策划角色请求 `GET /api/v1/tenants/current` 返回 200；请求员工列表返回 200，但请求删除员工返回 403
- [ ] 连错密码 5 次 → 第 6 次被锁
- [ ] Refresh token 过期后调 `/refresh` 返回 401
- [ ] 邀请 token 用过一次再用 → 409
- [ ] 员工被禁用后 → 下次请求 403（token 仍有效）
- [ ] basic 档超员工限额 → 422

## 9 · 验收标准

- [ ] 所有任务清单完成
- [ ] 单元测试覆盖率 ≥ 70%，e2e 覆盖所有关键路径
- [ ] Swagger `/api/docs` 所有 13 个端点可调、描述完整
- [ ] 两家租户完整 demo：注册 → 邀请 → 角色隔离 → 菜单差异
- [ ] 密码最少 8 位 + 手机号唯一约束在 DB 层（不仅前端）
- [ ] CLAUDE.md 末尾追加更新时间戳

## 10 · 交接清单（Handoff to Phase 2）

### 可用 API

- `POST /api/v1/auth/*` 全家桶
- `GET /api/v1/tenants/current`
- `GET /api/v1/staff` · `POST /api/v1/staff/invite`
- 所有端点鉴权已就绪

### 可用数据

- `Tenant` · `Staff` · `User` 实体
- 种子：2 个租户 × 3 员工 = 6 账号（见 `seeds/phase-1.ts`，文件内含测试手机号与密码）

### 可复用装饰器 / Guards

- `@Public()`、`@Roles(...)`、`@CurrentUser()`、`@CurrentTenant()`
- `TenantGuard` 已全局启用，service 层查询可直接使用 `req.tenantId`
- `OwnershipGuard`（接 `ownerField` 参数，PM 资源过滤）

### 可复用前端能力

- `auth.store.ts`：任何页面可 `useAuthStore().currentUser` 拿到当前人
- `menu.store.ts`：新 phase 页面通过 `registerMenuItem({ path, title, roles })` 注册
- 路由守卫已处理 401 / 权限 / 菜单

### 已知问题

- 短信服务未实装，验证码 console 打印；phase 8 替换为真实短信
- 订阅档位硬编码，超员工上限阻塞升级，V2 接入计费后解除

### 回归测试

- `e2e/auth-tenant-isolation.spec.ts`
- `e2e/rbac.spec.ts`

## 11 · 风险与开放问题

- [ ] 待决策：强制开启双因子认证（2FA）？— 当前 MVP 不做，CC 若要求则插入 phase 8
- [ ] 待决策：管理员离职后能否"交接"给另一管理员？— 当前 MVP 不做，V2 加
- [ ] 技术风险：JWT refresh token 泄漏处理策略 — 建议加入 token 指纹（IP + UA）验证

---

_文档版本_：1.0 · 2026-04-20

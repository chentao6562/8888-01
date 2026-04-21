# API 约定 · REST 契约

> 所有后端 phase 必须遵守。前端 phase 按此消费。

---

## 1 · Base URL 与版本

- 开发：`http://localhost:3000/api/v1`
- 预发：`https://api-staging.mindlink.cn/api/v1`
- 生产：`https://api.mindlink.cn/api/v1`

版本号只在路径，如 `/api/v1/customers`。破坏性变更 → `/v2`。

---

## 2 · 鉴权

### 2.1 Header

```
Authorization: Bearer <JWT>
X-Tenant-Id: <tenant_uuid>     // 可选，JWT 已含；冲突时 JWT 优先
```

### 2.2 JWT 载荷

```json
{
  "sub": "<user_id>",
  "staffId": "<staff_id>",
  "tenantId": "<tenant_id>",
  "role": "admin|pm|strategist|creator|adops",
  "exp": 1700000000,
  "iat": 1699990000
}
```

### 2.3 登录返回

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 3600,
  "user": { "id": "...", "name": "...", "role": "pm" }
}
```

### 2.4 客户端（微信小程序）特殊鉴权

```
X-Client-Type: miniprogram
Authorization: Bearer <客户 JWT>
```

客户 JWT 的 `role` 恒为 `customer`，`customerId` 字段指向对应 Customer。

---

## 3 · URL 与方法约定

### 3.1 资源复数 + 小写连字符

```
GET    /api/v1/customers                  // 列表
GET    /api/v1/customers/:id              // 详情
POST   /api/v1/customers                  // 创建
PATCH  /api/v1/customers/:id              // 部分更新
PUT    /api/v1/customers/:id              // 全量更新（少用）
DELETE /api/v1/customers/:id              // 软删除
```

### 3.2 嵌套资源（深度 ≤ 2）

```
GET    /api/v1/customers/:id/contracts
POST   /api/v1/projects/:id/tasks
```

超过 2 层用 query：`GET /api/v1/tasks?projectId=...&assigneeId=...`

### 3.3 动作类端点（非 CRUD）

用动词后缀：

```
POST   /api/v1/leads/:id/convert-to-diagnosing
POST   /api/v1/videos/:id/submit-for-review
POST   /api/v1/videos/:id/approve
POST   /api/v1/contracts/:id/send-for-signing
```

---

## 4 · 请求与响应

### 4.1 分页

Query 参数：

```
?page=1&pageSize=20&sort=-createdAt    // sort 前加 - 表示 desc
```

响应：

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 147,
    "totalPages": 8
  }
}
```

### 4.2 筛选

```
?stage=lead,diagnosing&industry=restaurant&search=王老板
```

- 多值用逗号
- `search` 是全字段模糊搜索（具体字段由后端定义）

### 4.3 字段选择（可选，V2 再做）

```
?fields=id,name,stage
```

### 4.4 标准响应结构

**成功**（200 / 201 / 204）：

```json
{
  "data": { ... }           // 单对象
}

{
  "data": [ ... ],          // 列表
  "pagination": { ... }
}
```

**失败**：

```json
{
  "error": {
    "code": "CUSTOMER_NOT_FOUND",
    "message": "客户不存在或已被删除",
    "details": { "customerId": "..." },
    "traceId": "abc-123"
  }
}
```

---

## 5 · HTTP 状态码

| 码 | 场景 |
|---|---|
| 200 | GET / PATCH 成功 |
| 201 | POST 创建成功 |
| 204 | DELETE 成功（无 body） |
| 400 | 入参校验失败（Zod 错误） |
| 401 | 未登录 / token 失效 |
| 403 | 权限不足 / 租户越界 |
| 404 | 资源不存在 |
| 409 | 状态冲突（状态机非法跳转、乐观锁） |
| 422 | 业务规则失败（例：续约窗口未开放） |
| 429 | 限流 |
| 500 | 服务器错误 |
| 502/503 | 第三方依赖问题（LLM / 电子签） |

---

## 6 · 错误码规范

### 6.1 命名

`{DOMAIN}_{ERROR}`，全大写 snake_case。

### 6.2 MVP 错误码表（增量维护，每 phase 新增写到本节）

| Code | HTTP | 说明 | 定义 phase |
|---|---|---|---|
| `VALIDATION_FAILED` | 400 | 通用入参校验失败 | 0 |
| `UNAUTHORIZED` | 401 | 未登录 | 1 |
| `TOKEN_EXPIRED` | 401 | token 过期 | 1 |
| `FORBIDDEN` | 403 | 无权限 | 1 |
| `TENANT_MISMATCH` | 403 | 跨租户访问 | 1 |
| `TENANT_NOT_FOUND` | 404 | 租户不存在 | 1 |
| `STAFF_NOT_FOUND` | 404 | 员工不存在 | 1 |
| `STAFF_DISABLED` | 403 | 员工已禁用 | 1 |
| `CUSTOMER_NOT_FOUND` | 404 | 客户不存在 | 2 |
| `LEAD_ALREADY_CONVERTED` | 409 | 线索已被转化 | 2 |
| `DIAGNOSIS_INCOMPLETE` | 422 | 诊断必填项未完成 | 2 |
| `CONTRACT_NOT_FOUND` | 404 | 合同不存在 | 3 |
| `CONTRACT_ALREADY_SIGNED` | 409 | 合同已签，不可编辑 | 3 |
| `PAYMENT_ALREADY_PAID` | 409 | 付款已登记，不可重复 | 3 |
| `VIDEO_NOT_FOUND` | 404 | 视频不存在 | 3 |
| `VIDEO_INVALID_STATUS_TRANSITION` | 409 | 视频状态机非法跳转 | 3 |
| `LLM_SERVICE_UNAVAILABLE` | 502 | LLM 服务异常 | 4 |
| `LLM_QUOTA_EXCEEDED` | 429 | AI 配额超限 | 4 |
| `SENSITIVE_WORD_DETECTED` | 422 | 命中敏感词 | 4 |
| `REPORT_NOT_READY` | 422 | 月报生成尚未完成 | 5 |
| `RENEWAL_WINDOW_CLOSED` | 422 | 续约窗口已关闭 | 6 |
| `ESIGN_FAILED` | 502 | 电子签调用失败 | 8 |

---

## 7 · 数据格式

### 7.1 时间

统一 ISO 8601 UTC：`2026-04-20T09:30:00.000Z`。前端转本地时区显示。

### 7.2 金额

单位 **分**（整数），不用浮点。字段名加 `Amount` 后缀，如 `totalAmount: 150000` = 1500 元。

### 7.3 ID

uuid v4，字符串。

### 7.4 枚举

小写 snake_case 字符串：`'lead'`、`'pending_review'`。后端用 TypeORM 的 enum 列。

### 7.5 空值

用 `null` 不用 `undefined` 也不用空字符串（除非字段语义需要）。

---

## 8 · 多租户强制

### 8.1 中间件行为

- `TenantGuard` 在 controller 层自动注入 `req.tenantId`
- Service 层查询经 `TenantQueryBuilder` 强制附加 `WHERE tenant_id = :tenantId`
- 如需跨租户（仅平台管理员）显式 `skipTenantFilter: true` 并记审计日志

### 8.2 插入时

所有 `POST` 创建接口在 service 层自动填充 `tenantId` 和 `createdBy`，不接受客户端传入。

---

## 9 · 权限控制

### 9.1 装饰器

```typescript
@Controller('customers')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
export class CustomersController {

  @Get()
  @Roles('admin', 'pm', 'strategist')
  list() { ... }

  @Post()
  @Roles('admin', 'pm', 'strategist')
  create() { ... }

  @Delete(':id')
  @Roles('admin')
  remove() { ... }
}
```

### 9.2 资源所有权

PM 只能访问 `pmId = 自己` 的客户（策划同理）。用 `@OwnershipGuard` 实现。管理员例外。

### 9.3 客户端专用端点

客户端路由全部前缀 `/api/v1/client/...`，由 `CustomerAuthGuard` 保护，只认 `role = customer`。例：

```
GET /api/v1/client/dashboard
GET /api/v1/client/videos/pending-review
POST /api/v1/client/videos/:id/review
GET /api/v1/client/monthly-reports
```

---

## 10 · 文件上传

### 10.1 预签名 URL 模式

大文件（视频 / 图片）走预签名直传 OSS：

```
POST /api/v1/uploads/presign
Body: { type: 'video'|'image'|'audio'|'doc', filename, contentType, size }
Response: { uploadUrl, fileUrl, expiresAt }
```

前端直传 OSS → 拿 `fileUrl` 交业务接口。

### 10.2 小文件直传（< 1MB）

走 `multipart/form-data`：`POST /api/v1/uploads`，服务端代转 OSS。

### 10.3 限制

- 视频：≤ 500MB，mp4/mov
- 图片：≤ 10MB，jpg/png/webp
- 音频：≤ 50MB，mp3/wav/m4a
- 文档：≤ 20MB，pdf/doc/docx/xlsx

---

## 11 · 限流

- 默认：每租户每分钟 600 请求
- AI 端点：每租户每分钟 30 请求（LLM 调用）
- 上传端点：每租户每分钟 20 请求

超限返回 429 + `Retry-After` header。

---

## 12 · 审计与日志

关键操作需写审计表 `audit_logs`：
- 登录 / 登出
- 合同签署 / 付款登记
- 数据导出
- 删除操作
- 跨租户访问（平台管理员）

---

## 13 · 幂等性

`POST` 创建类接口可选接受 `Idempotency-Key` header。服务端缓存 24 小时。推荐用于：
- 付款登记
- 合同签署
- 月报推送

---

## 14 · OpenAPI / Swagger

后端启用 `@nestjs/swagger`，开发环境 `/api/docs` 开放。每个端点需：
- `@ApiOperation` 描述
- `@ApiResponse` 所有状态码
- DTO 用 Zod → 通过 `nestjs-zod` 自动生成 schema

---

## 15 · 前端消费约定

### 15.1 axios 实例

```typescript
// apps/admin-web/src/api/http.ts
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 30000,
});

http.interceptors.request.use(cfg => {
  cfg.headers.Authorization = `Bearer ${getToken()}`;
  return cfg;
});

http.interceptors.response.use(
  r => r.data,
  err => handleError(err)
);
```

### 15.2 错误处理

- 401 → 跳登录
- 403 → toast "无权限"
- 5xx → toast + 上报 Sentry
- 其他 → 透传给调用方，组件决定展示

---

_文档版本_：1.0 · 2026-04-20

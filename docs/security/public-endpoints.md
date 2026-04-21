# Public Endpoints 白名单

`@Public()` 装饰器跳过 JWT 鉴权 · 任何新增/删除必须同步本文件 + 经 owner 评审。

`scripts/security-scan.sh` 在 G.5 检查此处计数与代码一致。

---

## 9 个公开端点

- `POST /api/v1/auth/register-tenant` · 注册公司 + admin（带限流 5/h）
- `POST /api/v1/auth/login` · 登录（带限流 10/min · 6 次错锁账号）
- `POST /api/v1/auth/refresh` · 刷新 access token（refresh token 必须有效）
- `POST /api/v1/auth/accept-invite` · 凭 inviteToken 设密 + 自动登录
- `POST /api/v1/client/auth/wechat-login` · 微信 code 换 openid（带限流 20/min）
- `POST /api/v1/client/auth/bind-phone` · 客户首次绑定手机号（带限流 10/min）
- `POST /api/v1/client/auth/dev-login` · 开发直连登录（NODE_ENV=production 永远 403）
- `POST /api/v1/contracts/:id/esign-callback` · 电子签 provider 回调（real provider 强制 HMAC 签名校验）
- `GET /api/v1/health` · 健康检查（K8s probe + 监控）

---

## 风险评估

| 端点 | 主要风险 | 缓解 |
|---|---|---|
| register-tenant | 批量注册占用 | 1 小时 5 次限流 |
| login | 暴力破解 | 60 秒 10 次 + 6 次错密 30 分钟锁 |
| refresh | refresh token 泄漏后续命 | 30 天 TTL · 后续可加吊销表 |
| accept-invite | inviteToken 泄漏 | token 一次性使用 + 24h TTL |
| client/auth/wechat-login | WeChat code 重放 | code 单次有效（微信侧保证）+ 限流 |
| client/auth/bind-phone | 暴力绑定他人手机号 | tempToken 15 分钟 TTL · phase 8.5 加短信验证码 |
| client/auth/dev-login | 生产被启用 | NODE_ENV=production 硬禁用（无 escape hatch） |
| contracts/esign-callback | 任意篡改合同状态 | 真实 provider 强制 HMAC-SHA256 签名校验 |
| health | 信息泄漏 | 仅返回 ok/down 状态 |

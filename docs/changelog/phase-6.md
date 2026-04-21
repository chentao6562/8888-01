# Phase 6 · 续约 · 流失 · 管理驾驶舱 · 完工报告

**完工时间**：2026-04-21
**owner**：claude-opus-4-7

## 一句话

合同到期前 30 天自动进入续约预警，AI 生成提案，PM 谈判记录全留痕；流失客户按原因归档，月度自动分析。老板每天 9 点打开驾驶舱即看客户红绿灯 + 团队产能 + 本月指标 + 现金流 + 今日 3 件决策。

---

## API 产出

### 新模块（4）

1. **renewals** · 9 端点 · 到期扫描 + AI 提案 + 谈判记录 + won/lost
2. **churn** · 4 端点 · 流失档 + 访谈补充 + 月度原因分析
3. **goals** · 3 端点 · 月度公司目标（新签 / 续约 / 流失红线 / 营收 / 客单价）
4. **dashboard** · 6 端点 · 5 大 collector + 今日 3 件决策

### 新增实体（4）

- `RenewalRecordEntity` · 状态机 `warning → negotiating → won/lost`
- `NegotiationNoteEntity` · 谈判沟通记录
- `ChurnRecordEntity` · 唯一 `(customerId)`，原因 5 类
- `CompanyGoalEntity` · 唯一 `(month)`

### 驾驶舱 5 大 Collector

```
CustomerLights: 按 healthLevel 分组 + 红灯客户 Top 3 预警
TeamCapacity:   按角色聚合活跃任务占用率（≥95% danger · ≥80% warn）
MonthlyKpi:     新签/续约/流失 vs 目标 + 续约率 + 客单价
Cashflow:       本月 paid payments 累计
DailyDecisions: 红灯 + 满负荷 + 超时线索 + 逾期付款 · Top 3 by priority
```

### 续约优惠策略（PRD §4.7.3）

- **绿灯客户** → 5% 折扣
- **黄灯客户** → 平价 + 月中专项复盘
- **红灯客户** → 平价 + 客户成功保障条款

### 状态机联动（修订）

- `renewing → delivering` 合法路径加入 Customer 状态机（phase 2 的常量更新）
- `renewal.won` 触发 `customer.stage: renewing → delivering`
- `renewal.lost` + 创建 `ChurnRecord` 触发 `customer.stage → churned`
- 续约扫描时 `customer.stage: delivering/reviewing → renewing`

---

## Admin Web 产出

### 新视图（3）· 驾驶舱像素级还原

- `views/dashboard/DashboardView.vue` · **严格按 `01_dashboard.html` 还原**
  - 欢迎横幅（问候语 + 月度进度 + 全公司健康度）
  - **客户红绿灯**（3 列 · 红灯客户 Top 3 带原因）
  - **团队产能**（按角色进度条 · cap-good/warn/danger 色彩语义）
  - **本月业务指标**（5 卡 · 新签 vs 目标对比）
  - **现金流**（深蓝背景 · 3 列收入/成本/净利润）
  - **今日 3 件决策**（5 类 priority 排序 · 支持 dismiss + 去看跳转）
- `views/renewals/RenewalBoardView.vue` · 二维矩阵（X: 到期天数 · Y: 健康度 · 右下 = 危险象限）+ 列表
- `views/renewals/RenewalDetailView.vue` · 左信息 + 右提案 + 谈判时间轴 + won/lost 按钮

### 菜单

phase 6 新亮起：**管理驾驶舱 · 续约预警**。MVP 所有主菜单已全部激活。

---

## 测试

### E2E（`pnpm --filter @mindlink/api test:e2e`）

**81/81 passed** · 7 suites（phase-6 新增 11）：
- 续约扫描自动创建 warning 记录 + 客户 stage=renewing
- AI 提案生成 → stage=negotiating
- 谈判记录持久化
- markWon → customer.stage=delivering（联动状态机修订）
- markLost + churn 记录 → customer.stage=churned
- Dashboard 5 模块齐全
- Daily decisions 识别 overdue payment
- Churn 月度分析按原因聚合
- 跨租户：B 看不到 A 的 dashboard 数据

### 全面穿行（`bash scripts/walkthrough.sh`）

**137/137 passed** · 耗时 88 秒。新增 J 段 19 断言覆盖 goals/renewals/dashboard 全套 API。
J 段使用 seed 老彭 admin 登录（因其数据已通过 phase-6 seed 构造到期），与穿行前期新租户解耦。

---

## 关键业务规则覆盖

| PRD 附录 C 规则 | 验证位置 | 结果 |
|---|---|---|
| 续约预警提前 30 天 | WARNING_WINDOW_DAYS 常量 + scan 逻辑 | ✓ |
| 续约优惠策略（绿 5% · 黄 0 · 红 0+保障） | renewals.service 逻辑 | ✓ |
| 流失原因 5 分类 | ChurnReason 类型 | ✓ |
| 驾驶舱仅 admin 可见 | `@Roles('admin')` + e2e 租户隔离 | ✓ |
| 每角色 100% 红色预警 | cap-danger 阈值 95% | ✓ |

---

## 交接给 Phase 7

### 可用 API

- 续约 / 流失 / 驾驶舱 API 全套
- `DashboardService.dashboard()` 单次聚合所有 5 模块 + 决策

### 可复用后端

- `scanWarnings()` 逻辑独立，phase 8 接 `@nestjs/schedule` 每天 08:00 自动扫
- `dailyDecisions()` 5 类规则已定义，V2 做规则引擎可配置

### 可复用前端

- `DashboardView` 的布局（欢迎横幅 + 2 列 grid + 5 指标卡）可供小程序（phase 7）客户端首屏参考
- 续约二维矩阵（到期 × 健康度）· 独立组件可供分析模块复用

---

## 已知问题 / 推迟项

- **定时任务**：续约扫描 / 决策识别 / 健康度刷新 · 均为手动触发，phase 8 接 `@nestjs/schedule`
- **成本数据**：`cashflow.costCents = 0`，V2 接财务或手工录入 `monthly_costs` 表
- **团队产能基准**：按角色硬编码（策划 8 · PM 10 · 创作者 6 · 投手 8），V2 做管理后台配置
- **驾驶舱实时性**：每次请求重算，数据量大时需 Redis 缓存（phase 8）
- **推荐奖励扣抵**：仅记录不扣抵（V2 余额账户）

---

## 启动

```bash
# 全量种子（幂等 · 已有跳过）
pnpm --filter @mindlink/api seed:phase-1
pnpm --filter @mindlink/api seed:phase-2
pnpm --filter @mindlink/api seed:phase-3
pnpm --filter @mindlink/api seed:phase-4
pnpm --filter @mindlink/api seed:phase-5
pnpm --filter @mindlink/api seed:phase-6

pnpm --filter @mindlink/api dev            # :3000
pnpm --filter @mindlink/admin-web dev      # :5173

# 登录 13900000001 / Passw0rd!
# 侧栏新亮：管理驾驶舱 · 续约预警
# 打开驾驶舱可看到：
#   - 客户红绿灯（基于 phase-5 健康度数据）
#   - 团队产能（4 个角色占用率）
#   - 本月业务指标（新签 vs 目标）
#   - 现金流（已收 paid payments）
#   - 今日 3 件决策
```

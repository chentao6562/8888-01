# Phase 5 · 数据 · 月报 · 健康度 · 完工报告

**完工时间**：2026-04-21
**owner**：claude-opus-4-7

## 一句话

每月 1 号自动拉取各平台数据 → AI 出 6 段式月报初稿 → PM 30 分钟修订 → 推送客户；客户健康度 5 维加权自动算出红绿灯；三层数据分析一览。

---

## API 产出

### 新模块（6）

1. **metrics** · 6 端点 · 手工录入 upsert + 批量导入 + 时序查询 + 月度聚合 + 异常检测
2. **complaints** · 3 端点 · CRUD + handle
3. **nps** · 2 端点 · 提交（幂等：同 customer+report 唯一）+ 列表
4. **health-score** · 3 端点 · 5 维加权计算 + 历史 + 手动重算
5. **reports** · 5 端点 · AI 生成 6 段月报 + 编辑 + 推送 + 标记已读
6. **analytics** · 3 端点 · 项目层 / 客户层（6 月趋势）/ 公司层（仅 admin）

### 新增实体（5）

- `VideoMetricEntity` · 唯一 `(videoId, platform, date)` · 含异常标记
- `MonthlyReportEntity` · 唯一 `(customerId, month)` · 状态机 `drafting → pending_review → sent → read`
- `NpsRecordEntity` · 唯一 `(customerId, reportId)` · 0-10 分
- `ComplaintEntity` · severity low/mid/high · status open/handling/closed
- `HealthScoreSnapshotEntity` · 唯一 `(customerId, month)` · 5 维独立存储 + 总分 + level

### 健康度 5 维加权（PRD 附录 C）

```
total = business*0.30 + delivery*0.20 + nps*0.20 + interaction*0.15 + complaint*0.15
level = total >= 85 ? green : total >= 60 ? yellow : red
```

- **业务**：月度 avgRoi 映射（ROI ≥ 1.5 满分、0.5-1 → 65、<0.5 → 40）
- **交付**：本月任务 onTime / (onTime + overdue) 百分比
- **NPS**：本月均分 × 10（0-100）
- **互动**：lastContactAt 距今 7/14/30 天 → 100/80/60（phase 7 客户端埋点后更准）
- **投诉**：100 - penalty（low=5 · mid=15 · high=30）

客户表回写 `healthScore` / `healthLevel` · 实时同步到客户列表健康度光条。

### 月报 6 段结构（PRD §4.6）

AI 生成 `aiDraft`（markdown）+ sections（JSON 结构化）:
1. 本月总览（plays / roi / adSpend）
2. 本月交付物
3. 流量分析
4. 爆款拆解 Top 3
5. 未达标反思
6. 下月重点

推送后 `sent` 状态锁定（409 `REPORT_NOT_EDITABLE`），只能 `mark-read`。

### 月度聚合算法

`monthlyAggregate(customerId, month)`：按 videoId 加总 plays/likes/comments/shares/adSpend，avgRoi 按记录数平均。
输出 `byVideo` 数组按 plays 降序（Top 3 直接是前 3 条）。

### 异常检测

`scanAnomalies()`：某视频当日 plays < 前 3 天均值 × 50% → 标 `anomalyFlag`。phase 8 接定时任务每日 10:00 扫。

---

## Admin Web 产出

### 新视图（3）

- `views/metrics/MetricsEntryView.vue` · 左输入右历史时序 · 支持 7 字段录入（含 ROI 小数）
- `views/reports/MonthlyReportListView.vue` · 报告列表 + 生成表单（选客户 + 选月份）
- `views/reports/MonthlyReportEditorView.vue` · 左信息 + 右 markdown 编辑器 · 推送按钮联动状态锁
- `views/analytics/CompanyAnalyticsView.vue` · 4 卡片（客户概况 + 生命周期分布条形图 + 本月现金流 + 逾期任务红灯）

### 菜单

phase 5 新亮起：**数据录入 · 月度报告 · 公司分析**。至此 PM 日常工作流全通。

---

## 测试

### E2E（`pnpm --filter @mindlink/api test:e2e`）

**70/70 passed** · 6 suites：
- health (1)
- phase1-auth (13)
- phase2-lifecycle (15)
- phase3-contracts (14)
- phase4-ai (12)
- phase5-data (15) · 本 phase 新增：
  - metrics upsert + 幂等覆盖
  - monthly aggregate 合并多平台多日
  - AI 生成月报 + 6 段数据结构
  - 编辑 finalContent → 推送 sent → 锁编辑 409
  - NPS 提交 + 重复 409 + 范围校验
  - 投诉创建 + 处理
  - 健康度 5 维独立可读
  - Analytics 公司层 / 客户层 6 月趋势
  - 跨租户 B 不能生成 A 客户的月报

### 全面穿行（`bash scripts/walkthrough.sh`）

**118/118 passed** · 耗时 81 秒。新增 I 段 20 断言覆盖 metrics → 月报 → NPS → 投诉 → 健康度 → 分析。

---

## 关键业务规则覆盖

| PRD 附录 C 规则 | 验证位置 | 结果 |
|---|---|---|
| 健康度 5 维权重 30/20/20/15/15 | `HEALTH_WEIGHTS` 常量 + e2e | ✓ |
| 红绿灯阈值 85 / 60 | `toLevel()` + snapshot | ✓ |
| NPS 0-10 + 单 report 唯一 | e2e I.8 | ✓ |
| 月报推送后锁定 | I.6 | ✓ |
| 6 段月报结构 | sections JSON | ✓ |
| 数据异常阈值（< 前 3 天均值 ×50%） | scanAnomalies | ✓ |

---

## 交接给 Phase 6

### 可用 API

- `HealthScoreService.currentOrRecalc()` · 续约看板按健康度二维排序直接调
- `MetricsService.monthlyAggregate()` · 续约提案生成可复用月度数据
- `AnalyticsService.company()` · 驾驶舱公司层直接读
- 月报 `sections` 结构化数据可给驾驶舱"月度指标"模块复用

### 可复用前端

- `CompanyAnalyticsView` 的"4 大卡片"布局 · 驾驶舱可参考
- `MonthlyReportEditorView` 的"侧栏信息 + 主区编辑器"模式 · 续约方案编辑器可继承
- 生命周期分布条形图（stage bars）· 驾驶舱直接抄

### 已知问题 / 推迟项

- **PDF 生成**：未做，phase 8 用 puppeteer
- **H5 静态化推送**：`h5Url` 字段已写，但暂未生成真实文件，phase 7 小程序端加 web-view 时补
- **定时任务**：每月 1 号自动生成 + 健康度快照 · 未接 `@nestjs/schedule`，phase 8 做
- **互动维度**：目前用 `lastContactAt` 粗估，phase 7 客户端埋点后接入登录次数 + 审核及时性
- **Excel 批量导入**：API 已有 batch-import 接口，但 UI 暂无解析器（前端接 SheetJS），phase 6 空档可补
- **成本录入**：公司层现金流只显示收入，成本字段待 V2

---

## 启动

```bash
# 全量种子（幂等 · 已有跳过）
pnpm --filter @mindlink/api seed:phase-1
pnpm --filter @mindlink/api seed:phase-2
pnpm --filter @mindlink/api seed:phase-3
pnpm --filter @mindlink/api seed:phase-4
pnpm --filter @mindlink/api seed:phase-5

pnpm --filter @mindlink/api dev            # :3000
pnpm --filter @mindlink/admin-web dev      # :5173

# 登录 13900000001 / Passw0rd!（A 公司管理员）
# 侧栏新亮：数据录入 · 月度报告 · 公司分析
```

看种子效果：
- 长虹驾校：3 月 × 3 视频 × 2 平台随机 metrics
- 2 个月已推送月报（sections 含聚合数据）
- 1 条 NPS + 1 条已处理投诉
- 健康度快照 83 (yellow)
- 客户列表健康度光条实时显示

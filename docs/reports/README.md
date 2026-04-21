# docs/reports · 验证报告目录

本目录存放**可追溯的验收报告**，每份报告对应一次完整的系统校验。

## 目录

| 文件 | 何时产生 | 说明 |
|---|---|---|
| `walkthrough-report.md` | 每段 phase 完工 or 随时要做综合验证 | 全链路端到端穿行结果 |
| `walkthrough-steps.txt` | 穿行脚本自动导出 | 每一步的 ✓/✗ 原始清单 |
| `walkthrough-summary.txt` | 同上 | PASS/FAIL/ELAPSED 汇总 |

## 重跑

在项目根目录运行：

```bash
bash scripts/walkthrough.sh
```

脚本会：
1. `taskkill` 清残留 node 进程
2. 重新编译 API（`nest build`）
3. 重新跑 `seed:phase-1` + `seed:phase-2`（干净的 `walkthrough.sqlite`，不影响 `dev.sqlite`）
4. 启动 API 在 :3500 + Admin Web 在 :5500（与 dev 3000/5173 隔离）
5. 按 A/B/C/D/E 5 阶段执行 55 个断言
6. 清理并退出

**预期**：全部通过，耗时 40-60 秒，退出码 0。

## 做什么 / 不做什么

**本穿行测试覆盖**：
- phase 0-2 的全部后端端点（auth / tenants / staff / customers / leads / diagnosis / proposals）
- 跨租户数据隔离
- RBAC 权限拦截
- 客户生命周期状态机（lead → diagnosing → proposing → signed）
- Admin Web dev server 能启动 + HTML 锚点存在

**本穿行测试不覆盖**：
- 真实浏览器 UI 交互（点击、表单提交）· 需人工验证或后续引入 Playwright
- 性能 / 压测 · phase 8
- phase 3+ 功能（合同 / 项目 / AI / 月报 / 驾驶舱 / 小程序）

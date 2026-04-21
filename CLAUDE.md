# MindLink · 代运营协同系统

> 面向本地代运营公司的双端 SaaS。Web 管理端给代运营团队用，小程序客户端给客户老板用。
> 核心差异：让客户和代运营公司活在同一个工作流里。

本文件是项目长期记忆索引。源需求见 `MindLink_PRD_v1.docx`（已抽取纯文本于 `prd_text.txt`），视觉真相源见 `prototype_extract/`，**分阶段协同开发文档见 [docs/](docs/README.md)**。

---

## 1 · 项目简介

- **产品**：MindLink · 代运营管理系统 v1.0
- **出品方**：思链科技 · 八方来客（内蒙古呼和浩特）
- **定位**：本地代运营公司 + 其客户老板 的双端协同 SaaS
- **计费**：订阅 + 按量双模式（基础 ¥299 / 专业 ¥999 / 企业 ¥2999 每月）
- **核心价值**：降低客户流失率 · 提升内容生产效率 · 沉淀方法论资产 · 让老板看清全公司

---

## 2 · 业务速览

### 客户生命周期 7 阶段（主线骨架）

| 阶段 | 名称 | 核心动作 | 主责 | 产出物 |
|---|---|---|---|---|
| S1 | 线索 | 客资录入·初筛 | 策划/PM | 线索档案 |
| S2 | 诊断 | 五维调研·定位工作法 | 策划 | 诊断报告 |
| S3 | 方案 | 套餐推荐·定位书 | 策划/PM | 签字定位书 |
| S4 | 签约 | 合同·分笔付款·启动会 | PM | 合同+启动会纪要 |
| S5 | 交付 | 内容生产·发布·投流 | PM+全员 | 视频成片+数据 |
| S6 | 复盘 | 月度报告·NPS | PM | 月度报告 |
| S7 | 续约 | 预警·续签/流失 | PM/管理员 | 续约合同/流失档 |

### 6 大用户角色

客户（小程序）· 策划 · 创作者 · 投手 · PM · 管理员（Web 管理端为主）。多租户 RBAC，权限矩阵详见 PRD §2.2。

### 5 大功能模块

1. **CLM 客户生命周期管理**（覆盖 S1-S7）：线索池 · 诊断工作台 · 方案生成器 · 合同 · 月报 · 续约预警
2. **人机协同内容生产**（S5）：AI 访谈 · AI 定位 · AI 分镜 · AI 文案/标题/标签 · 老板口播辅助 · 兼职市场
3. **案例库与知识资产**：6 子库（文案/画面/BGM/标题/标签/投放）· 官方库+租户私库双层
4. **运营执行与多平台发布**：半自动发布 · 数据采集 · 投放管理 · 三层数据分析
5. **管理驾驶舱**（老板视图）：客户红绿灯 · 团队产能 · 本月指标 · 现金流 · 今日 3 件决策

### 产品三端

- **管理端** · Web PC · 代运营团队用
- **客户端主** · 微信小程序 · 客户老板用
- **客户端辅** · Web H5 · 客户老板桌面端用

---

## 3 · 技术栈（已定）

| 层 | 选型 |
|---|---|
| Web 管理端 | Vue 3 + Vite + TypeScript + Tailwind CSS + Pinia + Vue Router |
| 客户端（小程序 + H5） | uni-app（Vue 3），主端微信小程序 |
| 后端 | **NestJS + TypeORM** |
| 数据库 | PostgreSQL（主）+ Redis（缓存） |
| 对象存储 | 腾讯云 COS 或 阿里云 OSS |
| AI 层 | NestJS 内置 AI 模块 + LangChain.js，对接通义/DeepSeek/GPT（MVP 任选其一） |
| 部署 | Docker + K8s，腾讯云或阿里云 |
| 多租户 | 共享库 + `tenant_id` 中间件隔离 |

### 第三方集成（MVP 范围）

- 混元 / DeepSeek / GPT API（AI 能力）
- 电子签（法大大 或 e 签宝 · MVP 先接 1 家）
- 微信小程序（客户端）
- 短信服务（通知 + 验证码）

---

## 4 · 仓库结构（建议 Monorepo · pnpm workspace）

```
代运营协同系统/
├── apps/
│   ├── admin-web/          # Vue 3 管理端
│   ├── client-mp/          # uni-app 小程序 + H5
│   └── api/                # NestJS 后端
├── packages/
│   ├── ui/                 # 共享 UI 组件（基于原型 Design Token）
│   ├── shared/             # 类型/工具/常量（前后端共享）
│   └── config/             # ESLint / Prettier / TS 统一配置
├── docs/                   # 业务设计补充文档（按需）
├── prototype_extract/      # 解压后的原型稿（视觉真相源）
├── MindLink_PRD_v1.docx    # PRD 原文
├── prd_text.txt            # PRD 纯文本
├── CLAUDE.md               # 本文件
└── docker-compose.yml      # 本地起 PG/Redis/MinIO
```

---

## 5 · 原型还原约束

- **视觉真相源**：`prototype_extract/01_dashboard.html` · `02_customers.html` · `03_customer_detail.html`
- **Design Token**：段 0 从原型 `:root` CSS 变量抽取，落入 `packages/ui/tokens.ts` 和 `tailwind.config.ts`
  - 深色：`--dark-bg:#0F1B3C` / `--dark-bg-2:#1A2749` / `--dark-bg-3:#263459`
  - 浅色：`--light-bg:#FFFFFF` / `--card-bg:#F8FAFC` / `--card-border:#E2E8F0`
  - 品牌：`--navy:#1E2761` / `--cyan:#38BDF8` / `--teal:#0EA5E9`
  - 语义：`--red:#EF4444` / `--green:#10B981` / `--amber:#F59E0B`
- **像素级还原**：管理驾驶舱（段 6）、客户列表（段 2）、客户详情（段 2）必须贴合 PNG
- **新增页面**：未给出原型的页面按同一设计系统自行扩展，色彩/字号/间距/卡片样式必须一致
- **字体**：Microsoft YaHei + Inter（英文）

---

## 6 · MVP 分段开发路径（8 段 · 约 14 周）

**分段原则**：每段产出可跑通的闭环 · 可 demo · 有明确验收。前置依赖段优先。

---

### 段 0 · 工程基建（1.5 周）

**前置**：无 · **关键产物**：可 `pnpm dev` 跑起来的 5 服务

- [ ] Monorepo 初始化（pnpm workspace + Turborepo）
- [ ] `apps/admin-web` 脚手架（Vue 3 + Vite + TS + Tailwind + Pinia + Router）
- [ ] `apps/client-mp` 脚手架（uni-app + Vue 3 + 微信小程序预览）
- [ ] `apps/api` 脚手架（NestJS + TypeORM + PG 连接 + Redis）
- [ ] `packages/ui` Design Token + 基础组件（Button · Card · Table · Form · Modal）
- [ ] `packages/shared` 类型与 DTO 契约
- [ ] docker-compose：PG + Redis + MinIO 本地
- [ ] Lint/Prettier/Husky/Commitlint
- [ ] Github Actions CI（跑 type-check + lint + build）
- **验收**：5 端本地可启动，管理端打开登录页渲染正常

---

### 段 1 · 多租户 + 鉴权 + 基础权限（1.5 周）

**前置**：段 0 · **关键产物**：多租户 SaaS 骨架

- [ ] 租户 onboarding（注册公司 → 选档位硬编码 → 创建租户实例 → 默认管理员）
- [ ] JWT 登录 + Refresh Token + 登录态持久化
- [ ] 6 角色 + 权限矩阵落 DB（PRD §2.2 为准）
- [ ] `TenantGuard` 中间件：所有查询强制注入 `tenant_id`
- [ ] `RolesGuard` 装饰器：方法级权限拦截
- [ ] 员工管理页（邀请 · 分配角色 · 禁用）
- [ ] 登录 / 注册 / 忘记密码 UI
- **验收**：注册 2 家公司 → 各自邀请成员 → 策划角色看不到财务菜单；租户 A 的数据租户 B 查询为空

---

### 段 2 · S1-S3 客户生命周期前半段（2 周）

**前置**：段 1 · **关键产物**：客户从"线索"走到"签字定位书"

- [ ] 线索池（列表 + 看板双视图、筛选器、多渠道录入、Excel 批量导入）
- [ ] 线索自动分配（按工作量均衡 / 按行业专长）
- [ ] 24h 未跟进自动提醒（定时任务 + 站内通知）
- [ ] 客户列表（参照 `02_customers.html` 像素还原）
- [ ] 客户详情（参照 `03_customer_detail.html` 像素还原）
- [ ] 诊断工作台（4 把刀问卷 · 4 张卡 · 录音上传 · 照片上传）
- [ ] AI 访谈预问卷（60 问，LLM 接口先 mock）
- [ ] AI 诊断报告生成（mock LLM）
- [ ] 方案生成器（套餐推荐 · 报价计算器 · 定位书 PDF 生成）
- **验收**：新建 1 条线索 → 走完 S1→S3 → 产出带租户 logo 的定位书 PDF

---

### 段 3 · S4-S5 合同与交付（2 周）

**前置**：段 2 · **关键产物**：签约 → 日常任务流

- [ ] 合同模板库（变量字段 · 自动填充）
- [ ] 电子签对接（先 mock 接口，段 8 换真实）
- [ ] "先拍后付"分笔付款登记（20/40/35/5）
- [ ] 付款记录 + 付款提醒（到期推送给客户 + PM）
- [ ] 启动会工具（议程模板 · 结构化纪要 · 一键 PDF）
- [ ] 启动会任务自动同步到项目看板
- [ ] 项目看板（8 状态列：待策划/策划中/待拍摄/拍摄中/待剪辑/剪辑中/待发布/已发布）
- [ ] 任务甘特图
- [ ] "我的任务" + 超时预警（负责人 → PM → 管理员三级升级）
- **验收**：签 1 份合同 → 电子签走完（mock） → 启动会 → 任务派发到各角色「我的任务」

---

### 段 4 · 内容生产 AI 助手（1.5 周）

**前置**：段 3 · **关键产物**：AI 让策划/创作者提速

- [ ] 对接 1 个 LLM 服务（LangChain.js 网关）
- [ ] AI 文案（钩子 + 主体 + CTA 三段输出）
- [ ] AI 标题生成（5 候选 + 预期点击率排序）
- [ ] AI 标签推荐（平台 + 行业 + 本地 + 热点）
- [ ] 敏感词检测（平台禁用词库）
- [ ] 方言适配（标准话术 / 呼市话 / 东北话）
- [ ] 老板口播辅助（小程序端提词器 + 分段录制，**不做自动剪辑**，自动剪辑归 V2）
- [ ] 案例库 MVP（仅私库骨架，文案库 + 标题库，支持手动入库）
- **验收**：策划用 AI 生成一条视频完整 文案+标题+标签 组合 < 5 分钟

---

### 段 5 · S6 数据与月报（1.5 周）

**前置**：段 3 · **关键产物**：自动出月报推送客户

- [ ] 数据手工录入界面（MVP 不做自动采集，归 V2）
- [ ] 月度报告引擎（AI 生成初稿 + 所见即所得编辑器）
- [ ] 月报 6 段式结构：本月总览 / 交付物 / 流量分析 / 爆款拆解 / 未达标反思 / 下月重点
- [ ] 月报 PDF + H5 双形态
- [ ] 客户健康度评分（5 维加权：业务数据30% / 交付20% / NPS20% / 互动15% / 投诉15%）
- [ ] 健康度红绿灯（85+绿 / 60-84黄 / <60红）
- [ ] NPS 打分流程（月报读完自动弹窗）
- [ ] 三层数据分析（项目层 · 客户层 · 公司层）基础图表
- **验收**：自动为某客户生成月报 → PM 改 30 分钟 → 推送到客户小程序 → 客户读完打 NPS

---

### 段 6 · S7 续约 + 管理驾驶舱（1.5 周）

**前置**：段 5 · **关键产物**：老板驾驶舱 + 续约预警闭环

- [ ] 续约预警看板（到期前 30 天自动进入）
- [ ] 续约提案自动生成（基于历史数据 + 优惠政策）
- [ ] 续约谈判记录 · 方案版本管理
- [ ] 推荐奖励机制（老客户推荐新客户抵续费）
- [ ] 流失管理（原因分类 + 流失访谈模板 + 流失档案归档）
- [ ] **管理驾驶舱** 严格按 `01_dashboard.html` 像素还原
  - [ ] 客户状态红绿灯（点击红色跳客户详情）
  - [ ] 团队产能进度条（角色维度 · 100% 红色预警）
  - [ ] 本月业务指标（新签/续约/流失/续约率/客单价）
  - [ ] 现金流卡片（收入/成本/净利润）
  - [ ] 今日 3 件决策（系统自动识别）
- **验收**：驾驶舱与 PNG 逐像素比对通过；1 个到期客户触发续约预警 → 续约方案生成 → PM 谈判记录 → 续约签成

---

### 段 7 · 小程序客户端（2 周）

**前置**：段 5 · **关键产物**：MindLink 差异化核心

- [ ] 微信登录（手机号 / 合同关联绑定客户身份）
- [ ] 客户端首屏：问候栏 + 3 大核心数字（流水/到店/ROI） + 待办 + 本周视频 + 月报入口 + 底部 5 Tab
- [ ] 深蓝背景 + 白字大数字（遵循客户端设计原则：最简 / 一屏 / 动作导向 / 去术语化）
- [ ] 成片审核流
  - [ ] 带水印视频预览
  - [ ] 时间轴打点批注
  - [ ] 通过 / 小改 / 重拍 三按钮
  - [ ] 历史版本对比
- [ ] 月度报告阅读页（滚动式 · 图表可下钻 · 本月 vs 上月）
- [ ] 合同列表 + 分笔付款进度
- [ ] 付款凭证上传 · 发票申请
- [ ] 续约中心（到期前 30 天自动出现在首屏）
- [ ] 个人中心
- [ ] 微信推送（每月 1 号月报推送 · 48h 成片审核 SLA 提醒）
- **验收**：PM 在 Web 端推月报 → 客户微信收到 → 小程序打开读完 → 打 NPS 分 → 提交成功回显

---

### 段 8 · 集成测试 + Beta 部署（1.5 周）

**前置**：段 2-7 全部完成 · **关键产物**：MVP 上线

- [ ] 端到端测试：1 个客户走完 S1→S7 全链路
- [ ] 替换所有 mock：真实电子签（法大大 或 e 签宝）+ 真实 LLM
- [ ] 敏感数据加密（手机号 / 身份证 · AES 或列级加密）
- [ ] 视频素材签名 URL（防盗链）
- [ ] 审计日志：数据导出 / 合同签署 / 付款记录 关键操作留痕
- [ ] 性能压测（主要页面 P95 < 500ms）
- [ ] ICP 备案 + 等保初步
- [ ] 腾讯云/阿里云 K8s 部署
- [ ] 基础监控告警（Prometheus + Grafana + 钉钉/飞书机器人）
- [ ] 1-3 家 beta 代运营公司 onboarding · 3 个月免费
- **M2 里程碑**：MVP 功能全部可用，内部测试通过
- **M3 里程碑**：Beta 用户上线 · 收集反馈

---

## 7 · 关键业务规则（checklist · PRD 附录 C）

编码时务必与 PRD 附录 C 对齐：

- 分笔付款比例：**20%(策划) + 40%(拍摄) + 35%(剪辑) + 5%(尾款)**
- 客户健康度权重：**业务30% / 交付20% / NPS20% / 互动15% / 投诉15%**
- 续约预警触发：**合同到期前 30 天**
- 续约窗口：**到期前 30 天 ~ 到期后 7 天**
- NPS 触发：**每月月报阅读完成后**
- 新线索 SLA：**24 小时内初筛/跟进**
- 成片审核 SLA：**客户推送后 48 小时内决策**
- 案例库回流规则：**ROI > 1.5 的投放自动入库**
- 数据采集频次：**每日 02:00**（MVP 阶段手工录入代替）
- NPS 量表：**0-10 分 + 可选留言**

---

## 8 · 验收与里程碑

| 里程碑 | 对应段 | 验收 |
|---|---|---|
| M1 · 架构搭建完成 | 段 0-1 | Web + 小程序 + API 跑通，登录注册可用 |
| M2 · MVP 功能完成 | 段 2-7 | 所有 MVP 功能可用，内部端到端测试通过 |
| M3 · Beta 上线 | 段 8 | 1-3 家代运营公司开始用，收集首批反馈 |

**MVP 总预算**：约 14 周（≈ 3.5 月），预留 buffer。按 PRD 估算 5 工程师 × 3 月 ≈ 144 人天。

**MVP 不做（归 V2/V3）**：兼职市场 · 多平台自动发布 · AI 分镜可视化 · 投放管理完整版 · 数据自动采集 · 在线支付 · 电子发票 · 开放 API。待 MVP 结束后再规划。

---

## 使用本文件的约定

- 新会话开始时，Claude 先读本文件，再读 `prd_text.txt` 相关章节补充细节
- 执行某个阶段时，读对应 `docs/phase-N-*.md`（自包含作战指令）
- 每段开工前，对照本文件的「验收」重新确认段边界
- 业务规则有冲突时，**PRD 附录 C 为准**
- 视觉有冲突时，**`prototype_extract/` 为准**
- 机器人协同开发规则见 [docs/shared/handoff-protocol.md](docs/shared/handoff-protocol.md)
- 本文件任何修改需更新顶部"最近更新"（写入时追加）

## 协同开发文档入口

- 总索引：[docs/README.md](docs/README.md)
- 统一模板：[docs/shared/doc-template.md](docs/shared/doc-template.md)
- 数据模型：[docs/shared/data-model.md](docs/shared/data-model.md)
- API 约定：[docs/shared/api-conventions.md](docs/shared/api-conventions.md)
- Design Tokens：[docs/shared/design-tokens.md](docs/shared/design-tokens.md)
- 交接协议：[docs/shared/handoff-protocol.md](docs/shared/handoff-protocol.md)
- Phase 文档：
  - [段 0 · 工程基建](docs/phase-0-foundation.md)
  - [段 1 · 多租户 + 鉴权](docs/phase-1-tenant-auth.md)
  - [段 2 · CLM S1-S3](docs/phase-2-clm-s1-s3.md)
  - [段 3 · 合同 · 交付](docs/phase-3-contract-delivery.md)
  - [段 4 · AI 内容生产](docs/phase-4-ai-content.md)
  - [段 5 · 数据 · 月报](docs/phase-5-data-monthly.md)
  - [段 6 · 续约 · 驾驶舱](docs/phase-6-renewal-dashboard.md)
  - [段 7 · 小程序客户端](docs/phase-7-mini-program.md)
  - [段 8 · 集成 · Beta](docs/phase-8-integration-beta.md)

_最近更新_：
- 2026-04-20 · 初版 · CC
- 2026-04-20 · 新增 docs/ 协同开发文档集（9 phase × 6 shared 文档） · CC
- 2026-04-20 · **段 0 · 工程基建** 完工：monorepo 脚手架、三端骨架、UI 组件库、API `/api/v1/health` 联通、CI 就位。详见 [docs/changelog/phase-0.md](docs/changelog/phase-0.md)
- 2026-04-20 · **段 1 · 多租户 + 鉴权** 完工：TypeORM(sqlite/pg) + JWT + bcrypt + RBAC + 邀请流。12 端点，e2e 15/15 通过。种子命令 `pnpm --filter @mindlink/api seed:phase-1`（密码 `Passw0rd!`）。详见 [docs/changelog/phase-1.md](docs/changelog/phase-1.md)
- 2026-04-20 · **段 2 · CLM S1-S3** 完工：Customer 状态机 + 线索池 + 诊断工作台（4 刀 4 卡 + mock LLM 报告）+ 方案生成器（套餐 3 选 1 + 报价计算器 + 一张纸）。29 端点，e2e 29/29 通过。客户列表/详情页像素级还原原型。种子 `pnpm --filter @mindlink/api seed:phase-2`。详见 [docs/changelog/phase-2.md](docs/changelog/phase-2.md)
- 2026-04-20 · **全面穿行测试通过**：phase 0-2 一气呵成 55/55 断言通过（含跨租户、RBAC、状态机、签字闭环、Admin Web 冒烟）· e2e 回归 29/29 仍绿 · 脚本 `scripts/walkthrough.sh`（44s 一键重跑）· 详见 [docs/reports/walkthrough-report.md](docs/reports/walkthrough-report.md)
- 2026-04-20 · **段 3 · 合同 · 交付** 完工：4 状态机（Contract/Project/Task/Video）· 电子签 Mock provider · 先拍后付 4 笔付款（幂等登记）· 启动会定稿批量派任务 · 7 列视频看板。约 30 端点，e2e 43/43 通过，穿行 80/80 通过。种子 `pnpm --filter @mindlink/api seed:phase-3`。详见 [docs/changelog/phase-3.md](docs/changelog/phase-3.md)
- 2026-04-20 · **段 4 · AI 内容生产** 完工：LLM Provider 抽象（mock / openai-compat 可 env 切换 · 支持通义/DeepSeek/GPT）· 配额硬限（basic 5w / pro 20w / ent 100w 每月）· 敏感词预检+后检双保险 · AI 文案三段/标题5候选/标签15推/方言切换 · 案例库（官方+私库合并 · callCount 热度排序）。13 端点，e2e 55/55 通过，穿行 98/98 通过。种子 `pnpm --filter @mindlink/api seed:phase-4`。详见 [docs/changelog/phase-4.md](docs/changelog/phase-4.md)
- 2026-04-21 · **段 5 · 数据 · 月报 · 健康度** 完工：视频 metrics 手工录入 + 月度聚合 + 异常检测 · AI 6 段月报（drafting → sent → read 状态机）· NPS（0-10 · customer+report 唯一）· 投诉 CRUD + severity 加权 · **客户健康度 5 维加权**（业务30 / 交付20 / NPS20 / 互动15 / 投诉15）· 三层 Analytics（project / customer 6月趋势 / company 仅 admin）。22 端点，e2e 70/70 通过，穿行 118/118 通过。种子 `pnpm --filter @mindlink/api seed:phase-5`。详见 [docs/changelog/phase-5.md](docs/changelog/phase-5.md)
- 2026-04-21 · **段 6 · 续约 · 流失 · 驾驶舱** 完工：续约预警 30 天自动扫描 · AI 提案（绿灯 5% / 黄平价 / 红保障条款）· 谈判记录 + won/lost · 流失档 + 原因 5 类月度分析 · 月度公司目标录入 · **管理驾驶舱**（5 模块 + 今日 3 件决策 + 像素级还原 `01_dashboard.html`）。22 端点，e2e 81/81 通过，穿行 137/137 通过。种子 `pnpm --filter @mindlink/api seed:phase-6`。详见 [docs/changelog/phase-6.md](docs/changelog/phase-6.md)
- 2026-04-21 · **段 7 · 小程序客户端**（MindLink 差异化核心）完工：微信 mock provider + 客户 JWT 独立鉴权链（`role=customer` + `CustomerAuthGuard`）· 20 个 `/client/*` 端点（登录绑定 · 首屏聚合 · 视频打点批注 + 三选一 · 月报 6 段渲染 + 自动 NPS · 合同付款凭证 + 发票申请 · 续约卡预约 PM）· uni-app 7 页（login/home/videos·list+detail/reports·list+detail/renewals）· 管理端/客户端 JWT 互相拒绝（403 双向验证）。e2e 97/97 通过（+16），穿行 158/158 通过（+21）。种子 `pnpm --filter @mindlink/api seed:phase-7`。详见 [docs/changelog/phase-7.md](docs/changelog/phase-7.md)
- 2026-04-21 · **段 8 · 集成测试 + Beta 部署**（MVP 收官）完工：生产加固（AES-256-GCM 列加密 · 5 端点限流 · 7 项安全响应头 · CORS 白名单 · 全局 AuditInterceptor + @Audit 装饰 · devLogin/Swagger prod 守卫）· FadadaProvider stub + esign 切换位 · Dockerfile 双阶段（api < 300MB · admin-web Nginx < 50MB）· K8s manifests 全套（Deployment/Service/Ingress/HPA/StatefulSet/CronJob）· GitHub Actions staging 自动 + prod 手动确认 · 5 篇 runbook + 3 篇 onboarding + privacy/terms 页 · 穿行加 L 段 9 断言（167/167）· e2e 仍 97/97。**M3 里程碑达成：8 段全完工，~248 端点就绪，待运营接手 ICP/微信/电子签真实账号 + Beta 客户 onboarding**。详见 [docs/changelog/phase-8.md](docs/changelog/phase-8.md) · [docs/changelog/mvp-release.md](docs/changelog/mvp-release.md)
- 2026-04-21 · **上线前全面审计通过**：深度排查发现 5 HIGH（JWT alg=none / esign 回调无签名 / CORS 静默失败 / 加密 key 静默回落 / devLogin 后门）+ 4 MEDIUM（手机号日志 / DB 默认密码 / 上传 MIME 仅看头 / 异常信息泄漏）+ 验证管线漏洞（forbidNonWhitelisted 缺 + 5 个 DTO 无 MaxLength），**全部修复**。新增 `phase8-hardening.e2e-spec.ts`（28 用例：JWT/IDOR 跨租户/RBAC 矩阵/DTO 边界/prod-mode 守卫）· `scripts/security-scan.sh`（7 项静态检查）· `.env.production.example` · `docs/security/public-endpoints.md`（9 公开端点白名单）· walkthrough M 段 9 断言。最终：**e2e 125/125** · **walkthrough 176/176** · **scan 7/7** · 三端 typecheck + 双端 build 全 exit 0。详见 [docs/reports/pre-launch-audit.md](docs/reports/pre-launch-audit.md)

# 数据模型 · 跨 Phase 契约

> 全系统共用的数据实体定义与状态机。任何 phase 新增/修改实体字段，必须先更新本文件。

本文档对齐 PRD §10（数据模型与关键接口）。字段级细节和表结构由 `apps/api/src/entities/` 落地，本文件只定义契约。

---

## 1 · 命名与通用字段

### 1.1 通用字段（所有业务表必带）

```typescript
interface BaseEntity {
  id: string;              // uuid v4
  tenantId: string;        // 多租户强制隔离字段，索引
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;       // userId
  updatedBy: string;       // userId
  deletedAt: Date | null;  // 软删除
}
```

### 1.2 命名约定

- 表名：snake_case 复数，如 `customers`、`diagnosis_reports`
- 字段名：snake_case，如 `tenant_id`、`created_at`
- TypeScript 实体：PascalCase 单数，如 `Customer`、`DiagnosisReport`
- DTO：`{Action}{Entity}Dto`，如 `CreateCustomerDto`、`UpdateLeadDto`
- 枚举：UPPER_SNAKE_CASE，如 `LEAD`、`DIAGNOSIS`

### 1.3 多租户规则

- 所有业务表必带 `tenant_id`
- 所有查询经 `TenantGuard` 中间件强制 WHERE 过滤
- 仅 `tenants`、`users`（认证用）、`platform_cases`（官方案例库）可无 `tenant_id`

---

## 2 · 核心实体（9 大类）

### 2.1 Tenant（租户 · 一家代运营公司）

```typescript
interface Tenant {
  id: string;
  name: string;              // 公司名
  logo: string | null;       // OSS URL
  plan: 'basic' | 'pro' | 'enterprise';
  maxStaff: number;          // 档位对应的最大员工数
  status: 'active' | 'suspended' | 'expired';
  ownerId: string;           // 创始员工（管理员）
  contactPhone: string;
  contactEmail: string;
  createdAt: Date;
  expiresAt: Date;           // 订阅到期
}
```

**定义 phase**：1

### 2.2 Staff（员工 · 代运营公司的员工）

```typescript
interface Staff extends BaseEntity {
  userId: string;            // 指向 users 认证表
  name: string;
  phone: string;
  email: string;
  avatar: string | null;
  role: StaffRole;           // 见 2.2.1
  status: 'invited' | 'active' | 'disabled';
  invitedBy: string | null;
  joinedAt: Date | null;
}

type StaffRole =
  | 'admin'        // 管理员/老板
  | 'pm'           // 项目经理
  | 'strategist'   // 策划
  | 'creator'      // 创作者
  | 'adops';       // 投手
```

**定义 phase**：1

### 2.3 Customer（客户 · 代运营服务的 B 端客户）

```typescript
interface Customer extends BaseEntity {
  // 基础
  companyName: string;
  shopName: string | null;
  bossName: string;
  bossPhone: string;
  bossWechat: string | null;
  bossAvatar: string | null;

  // 分类
  industry: string;          // 餐饮 / 美业 / 零售 / 教培 / 本地服务 / 其他
  region: string;            // 省市区
  storeCount: number;

  // 来源
  source: 'referral' | 'website' | 'outreach' | 'ad' | 'other';
  budgetHint: 'lt_5k' | '5k_10k' | '10k_30k' | 'gt_30k' | 'unknown';

  // 状态
  stage: CustomerStage;      // 见下方状态机
  healthScore: number;       // 0-100，phase 5 计算
  healthLevel: 'green' | 'yellow' | 'red';

  // 关系
  pmId: string | null;       // 负责 PM
  strategistId: string | null;

  // 时间
  lastContactAt: Date | null;
  contractExpiresAt: Date | null;  // 最近合同到期
  churnedAt: Date | null;
}

type CustomerStage =
  | 'lead'           // S1 线索
  | 'diagnosing'     // S2 诊断中
  | 'proposing'      // S3 方案中
  | 'signed'         // S4 已签约
  | 'delivering'     // S5 交付中
  | 'reviewing'      // S6 复盘中
  | 'renewing'       // S7 续约中
  | 'churned';       // 已流失
```

**状态机**：

```
lead ─────► diagnosing ─────► proposing ─────► signed ─────► delivering
                                                                │
                                                                ▼
churned ◄───── renewing ◄───── reviewing ◄──────────────────────┘
   ▲                                                             │
   └─────────────────────────────────────────────────────────────┘
        (任意阶段可直接流失)
```

**定义 phase**：2 · 扩展 phase：5（healthScore）、6（renewing/churned）

### 2.4 Project（项目 · 一期代运营服务）

```typescript
interface Project extends BaseEntity {
  customerId: string;
  contractId: string;
  name: string;
  plan: 'starter_pack' | 'monthly_package' | 'annual_partner';  // 套餐
  status: 'kickoff' | 'running' | 'at_risk' | 'completed' | 'aborted';
  startAt: Date;
  endAt: Date;
  pmId: string;
  goals: ProjectGoal[];      // 月度目标 KPI
}

interface ProjectGoal {
  metric: 'gmv' | 'footfall' | 'roi';
  targetValue: number;
  actualValue: number;
  month: string;             // YYYY-MM
}
```

**定义 phase**：3

### 2.5 Contract（合同）

```typescript
interface Contract extends BaseEntity {
  customerId: string;
  projectId: string | null;  // 启动会后绑定
  contractNo: string;        // 系统生成
  templateId: string;
  totalAmount: number;       // 分
  status: ContractStatus;
  signedAt: Date | null;
  fileUrl: string | null;    // OSS 地址
  eSignOrderId: string | null;  // 电子签平台 order ID
  payments: Payment[];
  variables: Record<string, string>;  // 模板变量填充
}

type ContractStatus =
  | 'draft' | 'pending_sign' | 'signed' | 'executing'
  | 'completed' | 'renewed' | 'terminated';

interface Payment {
  id: string;
  stage: 'plan' | 'shoot' | 'edit' | 'final';   // 20/40/35/5
  ratio: number;             // 0.20 / 0.40 / 0.35 / 0.05
  amount: number;
  dueAt: Date;
  status: 'pending' | 'paid' | 'overdue';
  paidAt: Date | null;
  voucherUrl: string | null;
}
```

**定义 phase**：3

### 2.6 Video（视频 · 每一条产出的视频）

```typescript
interface Video extends BaseEntity {
  projectId: string;
  customerId: string;
  title: string;
  script: string | null;
  status: VideoStatus;

  // 角色
  strategistId: string;
  creatorId: string | null;       // 拍摄
  editorId: string | null;        // 剪辑
  adopsId: string | null;         // 投手

  // 文件
  rawMaterialUrls: string[];      // 原始素材
  draftVideoUrl: string | null;   // 带水印样片
  finalVideoUrl: string | null;   // 终片
  coverUrl: string | null;

  // 文案
  titles: string[];               // AI 候选标题
  tags: string[];
  copywriting: string | null;

  // 审核
  reviewStatus: 'pending' | 'approved' | 'minor_change' | 'reshoot' | null;
  reviewedAt: Date | null;
  reviewComments: VideoComment[];

  // 发布
  publishPlan: PublishPlan | null;
  publishedUrls: { platform: string; url: string; publishedAt: Date }[];

  // 数据（phase 5 录入）
  metrics: VideoMetrics[];
}

type VideoStatus =
  | 'planning' | 'shooting' | 'editing' | 'pending_review'
  | 'approved' | 'pending_publish' | 'published' | 'offline';

interface VideoComment {
  timestamp: number;        // 视频秒数
  author: string;
  text: string;
  createdAt: Date;
}

interface PublishPlan {
  platforms: string[];
  titles: Record<string, string>;
  tags: Record<string, string[]>;
  cover: string;
  scheduledAt: Date;
}

interface VideoMetrics {
  platform: string;
  date: string;             // YYYY-MM-DD
  plays: number;
  likes: number;
  comments: number;
  shares: number;
  collections: number;
  adSpend: number;
  roi: number;
}
```

**定义 phase**：3 · 扩展 phase：4（文案）、5（metrics）

### 2.7 Case（案例 · 案例库中的知识资产）

```typescript
interface Case extends BaseEntity {
  // tenantId 为 null = 官方库
  category: 'copy' | 'scene' | 'bgm' | 'title' | 'tag' | 'campaign';
  title: string;
  content: string;
  videoRef: string | null;       // 来源视频
  industry: string;
  metrics: {
    plays?: number;
    roi?: number;
    ctr?: number;
  };
  tags: string[];
  callCount: number;             // 被复用次数
  lastCalledAt: Date | null;
  freshness: 'fresh' | 'aging' | 'stale';  // 30/90 天老化
}
```

**定义 phase**：4（基础） · 扩展 phase：V2（官方库、自动回流）

### 2.8 Task（任务 · 员工的工作项）

```typescript
interface Task extends BaseEntity {
  projectId: string;
  videoId: string | null;
  type: 'plan' | 'shoot' | 'edit' | 'publish' | 'other';
  title: string;
  description: string;
  assigneeId: string;
  status: 'pending' | 'in_progress' | 'pending_review' | 'done' | 'rework' | 'overdue';
  dueAt: Date;
  completedAt: Date | null;
  escalatedAt: Date | null;      // 超时升级时间
}
```

**定义 phase**：3

### 2.9 Subscription（订阅 · 租户的 SaaS 订阅）

```typescript
interface Subscription extends BaseEntity {
  plan: 'basic' | 'pro' | 'enterprise';
  startAt: Date;
  expiresAt: Date;
  aiQuotaUsed: number;
  aiQuotaLimit: number;
  billingStatus: 'active' | 'suspended' | 'past_due';
}
```

**定义 phase**：1（基础） · 扩展 phase：V2（完整计费）

---

## 3 · 衍生实体

### 3.1 Lead（线索）

本质是 `stage='lead'` 的 Customer 子集，不单独建表。通过 view 或 where 过滤。

### 3.2 DiagnosisReport（诊断报告）

```typescript
interface DiagnosisReport extends BaseEntity {
  customerId: string;
  strategistId: string;
  interviewAudioUrls: string[];
  interviewTranscript: string | null;   // AI 转录
  sitePhotoUrls: string[];
  preInterviewAnswers: Record<string, string>;  // 60 问
  // 4 把刀
  knifeSelf: string;
  knifeEmployee: string;
  knifeOldCustomer: string;
  knifeCompetitor: string;
  // 4 张卡
  card1_sells: string;          // 他卖啥
  card2_customerMind: string;   // 客户半夜想啥
  card3_productVideo: string;   // 产品上视频
  card4_whyNotNext: string;     // 凭什么不选隔壁
  // 报告
  reportContent: string;
  reportPdfUrl: string | null;
  status: 'drafting' | 'completed';
}
```

**定义 phase**：2

### 3.3 PositioningBook（定位书）

```typescript
interface PositioningBook extends BaseEntity {
  customerId: string;
  diagnosisReportId: string;
  version: number;
  content: string;              // AI 生成 + 人工修订
  onePager: string;             // 一张纸定位
  plan: 'starter_pack' | 'monthly_package' | 'annual_partner';
  priceQuote: number;           // 分
  pdfUrl: string | null;
  signedAt: Date | null;
}
```

**定义 phase**：2

### 3.4 MonthlyReport（月度报告）

```typescript
interface MonthlyReport extends BaseEntity {
  projectId: string;
  customerId: string;
  month: string;                // YYYY-MM
  status: 'drafting' | 'pending_review' | 'sent' | 'read';
  aiDraft: string | null;
  finalContent: string;
  sections: MonthlyReportSections;
  pdfUrl: string | null;
  h5Url: string | null;
  pushedAt: Date | null;
  readAt: Date | null;
  npsScore: number | null;       // 0-10
  npsComment: string | null;
}

interface MonthlyReportSections {
  overview: { gmv: number; footfall: number; roi: number };
  deliverables: { videoCount: number; videos: string[] };
  trafficAnalysis: string;
  topVideos: { videoId: string; reason: string }[];
  missed: string;
  nextMonthFocus: string[];
}
```

**定义 phase**：5

### 3.5 RenewalRecord（续约记录）

```typescript
interface RenewalRecord extends BaseEntity {
  customerId: string;
  originalContractId: string;
  newContractId: string | null;
  stage: 'warning' | 'negotiating' | 'won' | 'lost';
  negotiationNotes: NegotiationNote[];
  lostReason: string | null;
  lostAnalysis: string | null;
}
```

**定义 phase**：6

### 3.6 KickoffMeeting（启动会纪要）

```typescript
interface KickoffMeeting extends BaseEntity {
  projectId: string;
  meetingAt: Date;
  goals: string;
  roles: { role: string; person: string; duty: string }[];
  schedule: string;
  risks: string[];
  communicationRule: string;
  pdfUrl: string | null;
}
```

**定义 phase**：3

### 3.7 HealthScoreSnapshot（健康度快照）

```typescript
interface HealthScoreSnapshot extends BaseEntity {
  customerId: string;
  month: string;
  totalScore: number;
  businessScore: number;     // 权重 30%
  deliveryScore: number;     // 20%
  npsScore: number;          // 20%
  interactionScore: number;  // 15%
  complaintScore: number;    // 15%
  level: 'green' | 'yellow' | 'red';
}
```

**定义 phase**：5

---

## 4 · 状态机汇总

### Customer
`lead → diagnosing → proposing → signed → delivering → reviewing → renewing → churned`

### Project
`kickoff → running → at_risk → (completed | aborted)`

### Contract
`draft → pending_sign → signed → executing → (completed | terminated) → renewed`

### Video
`planning → shooting → editing → pending_review → approved → pending_publish → published → offline`

### Task
`pending → in_progress → pending_review → (done | rework | overdue)`

---

## 5 · 关键索引建议

```sql
-- customers
create index idx_customers_tenant_stage on customers(tenant_id, stage);
create index idx_customers_tenant_pm on customers(tenant_id, pm_id);
create index idx_customers_contract_expires on customers(tenant_id, contract_expires_at);

-- videos
create index idx_videos_project_status on videos(project_id, status);

-- tasks
create index idx_tasks_assignee_status on tasks(assignee_id, status);
create index idx_tasks_due on tasks(due_at) where status in ('pending','in_progress');

-- contracts
create index idx_contracts_tenant_status on contracts(tenant_id, status);
```

---

## 6 · 数据种子（开发用）

每个 phase 可在 `apps/api/src/seeds/phase-{N}.ts` 放种子数据。原则：
- 至少 2 个租户（验证隔离）
- 每个租户至少 1 个管理员 + 2 员工
- 不同阶段客户各若干（验证状态机）

---

_文档版本_：1.0 · 2026-04-20

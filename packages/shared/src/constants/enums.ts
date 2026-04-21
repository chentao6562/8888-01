/** 员工角色（对齐 docs/shared/data-model.md §2.2）。 */
export const StaffRole = {
  Admin: 'admin',
  Pm: 'pm',
  Strategist: 'strategist',
  Creator: 'creator',
  AdOps: 'adops',
} as const;
export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];

/** 客户生命周期 7 阶段（对齐 PRD §3 与 data-model §2.3）。 */
export const CustomerStage = {
  Lead: 'lead',
  Diagnosing: 'diagnosing',
  Proposing: 'proposing',
  Signed: 'signed',
  Delivering: 'delivering',
  Reviewing: 'reviewing',
  Renewing: 'renewing',
  Churned: 'churned',
} as const;
export type CustomerStage = (typeof CustomerStage)[keyof typeof CustomerStage];

/** 订阅档位（MVP 硬编码）。 */
export const TenantPlan = {
  Basic: 'basic',
  Pro: 'pro',
  Enterprise: 'enterprise',
} as const;
export type TenantPlan = (typeof TenantPlan)[keyof typeof TenantPlan];

/** 先拍后付分笔比例（对齐 PRD 附录 C）。 */
export const PAYMENT_RATIOS = {
  plan: 0.2,
  shoot: 0.4,
  edit: 0.35,
  final: 0.05,
} as const;

/** 客户健康度权重（对齐 PRD §4.7.1）。 */
export const HEALTH_SCORE_WEIGHTS = {
  business: 0.3,
  delivery: 0.2,
  nps: 0.2,
  interaction: 0.15,
  complaint: 0.15,
} as const;

export const HEALTH_LEVEL_THRESHOLDS = {
  green: 85,
  yellow: 60,
} as const;

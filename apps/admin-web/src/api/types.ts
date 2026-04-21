export type StaffRole = 'admin' | 'pm' | 'strategist' | 'creator' | 'adops';
export type StaffStatus = 'invited' | 'active' | 'disabled';

export interface Staff {
  id: string;
  tenantId: string;
  userId: string | null;
  name: string;
  phone: string;
  email: string | null;
  avatar: string | null;
  role: StaffRole;
  status: StaffStatus;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  plan: 'basic' | 'pro' | 'enterprise';
  maxStaff: number;
  status: 'active' | 'suspended' | 'expired';
  ownerId: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  logo: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CustomerStage =
  | 'lead'
  | 'diagnosing'
  | 'proposing'
  | 'signed'
  | 'delivering'
  | 'reviewing'
  | 'renewing'
  | 'churned';

export const STAGE_LABELS: Record<CustomerStage, string> = {
  lead: 'S1 线索',
  diagnosing: 'S2 诊断',
  proposing: 'S3 方案',
  signed: 'S4 签约',
  delivering: 'S5 交付中',
  reviewing: 'S6 复盘',
  renewing: 'S7 续约中',
  churned: '流失',
};

export const STAGE_ORDER: CustomerStage[] = [
  'lead',
  'diagnosing',
  'proposing',
  'signed',
  'delivering',
  'reviewing',
  'renewing',
];

export const STAGE_DOT_COLOR: Record<CustomerStage, string> = {
  lead: '#F59E0B',
  diagnosing: '#3B82F6',
  proposing: '#6366F1',
  signed: '#8B5CF6',
  delivering: '#10B981',
  reviewing: '#06B6D4',
  renewing: '#EC4899',
  churned: '#64748B',
};

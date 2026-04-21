import { http } from './http';
import type { CustomerStage } from './types';

export interface Customer {
  id: string;
  tenantId: string;
  companyName: string;
  shopName: string | null;
  bossName: string;
  bossPhone: string;
  bossWechat: string | null;
  industry: string;
  region: string | null;
  storeCount: number;
  source: string;
  budgetHint: string;
  stage: CustomerStage;
  healthScore: number;
  healthLevel: 'green' | 'yellow' | 'red';
  pmId: string | null;
  strategistId: string | null;
  lastContactAt: string | null;
  contractExpiresAt: string | null;
  churnedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListParams {
  stage?: CustomerStage;
  industry?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CustomerListResult {
  data: Customer[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface StageCounts {
  total: number;
  byStage: Record<CustomerStage, number>;
}

export interface FollowUp {
  id: string;
  customerId: string;
  staffId: string;
  channel: 'call' | 'wechat' | 'visit' | 'email' | 'other';
  notes: string;
  createdAt: string;
}

export const customersApi = {
  list(params: CustomerListParams = {}) {
    return http.get<{ data: Customer[]; pagination: CustomerListResult['pagination'] }>(
      '/customers',
      { params },
    );
  },
  stageCounts() {
    return http.get<{ data: StageCounts }>('/customers/stage-counts');
  },
  detail(id: string) {
    return http.get<{ data: Customer }>(`/customers/${id}`);
  },
  create(body: {
    companyName: string;
    bossName: string;
    bossPhone: string;
    bossWechat?: string;
    industry: string;
    region?: string;
    source?: string;
    budgetHint?: string;
    notes?: string;
    storeCount?: number;
  }) {
    return http.post<{ data: Customer }>('/customers', body);
  },
  update(id: string, patch: Partial<Customer>) {
    return http.patch<{ data: Customer }>(`/customers/${id}`, patch);
  },
  transition(id: string, to: CustomerStage) {
    return http.post<{ data: Customer }>(`/customers/${id}/stage-transition`, { to });
  },
  archive(id: string) {
    return http.post<{ data: Customer }>(`/customers/${id}/archive`, {});
  },
  listFollowUps(id: string) {
    return http.get<{ data: FollowUp[] }>(`/customers/${id}/follow-ups`);
  },
  addFollowUp(id: string, body: { channel: FollowUp['channel']; notes: string }) {
    return http.post<{ data: FollowUp }>(`/customers/${id}/follow-ups`, body);
  },
};

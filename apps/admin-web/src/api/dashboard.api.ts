import { http } from './http';

export interface CustomerLight {
  count: number;
  samples: Array<{ id: string; name: string; score: number; reason?: string }>;
}

export interface DashboardData {
  lights: { green: CustomerLight; yellow: CustomerLight; red: CustomerLight };
  capacity: {
    byRole: Array<{
      role: string;
      activeCount: number;
      utilizationPct: number;
      level: 'good' | 'warn' | 'danger';
    }>;
  };
  kpi: {
    newCustomers: { actual: number; target: number };
    renewalCustomers: { actual: number; target: number };
    churnCustomers: { actual: number; redLine: number };
    renewalRate: number;
    arpuCents: number;
  };
  cashflow: { incomeCents: number; costCents: number; profitCents: number };
  decisions: Array<{
    id: string;
    type: string;
    title: string;
    desc: string;
    action: string;
    refId?: string;
    priority: number;
  }>;
}

export const dashboardApi = {
  all() {
    return http.get<{ data: DashboardData }>('/dashboard');
  },
};

export interface Renewal {
  id: string;
  customerId: string;
  stage: 'warning' | 'negotiating' | 'won' | 'lost';
  proposal: string | null;
  discountRatio: number | null;
  expiresAt: string;
  lostReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export const renewalsApi = {
  board() {
    return http.get<{ data: Renewal[] }>('/renewals/board');
  },
  list(stage?: string) {
    return http.get<{ data: Renewal[] }>('/renewals', { params: stage ? { stage } : undefined });
  },
  get(id: string) {
    return http.get<{ data: Renewal }>(`/renewals/${id}`);
  },
  scan() {
    return http.post<{ data: Renewal[] }>('/renewals/scan', {});
  },
  generateProposal(id: string) {
    return http.post<{ data: Renewal }>(`/renewals/${id}/generate-proposal`, {});
  },
  addNote(id: string, body: { channel?: string; notes: string }) {
    return http.post<{ data: unknown }>(`/renewals/${id}/notes`, body);
  },
  listNotes(id: string) {
    return http.get<{ data: Array<{ id: string; channel: string; notes: string; createdAt: string }> }>(
      `/renewals/${id}/notes`,
    );
  },
  won(id: string) {
    return http.post<{ data: Renewal }>(`/renewals/${id}/won`, {});
  },
  lost(id: string, reason: string, analysis?: string) {
    return http.post<{ data: Renewal }>(`/renewals/${id}/lost`, { reason, analysis });
  },
};

export const goalsApi = {
  current() {
    return http.get<{
      data: {
        month: string;
        newCustomers: number;
        renewalCustomers: number;
        churnRedLine: number;
        targetRevenue: number;
        targetArpu: number;
      } | null;
    }>('/goals');
  },
  upsert(body: {
    month?: string;
    newCustomers: number;
    renewalCustomers: number;
    churnRedLine: number;
    targetRevenue: number;
    targetArpu: number;
  }) {
    return http.post<{ data: unknown }>('/goals', body);
  },
};

import { http } from './http';

export type MonthlyReportStatus = 'drafting' | 'pending_review' | 'sent' | 'read';

export interface MonthlyReport {
  id: string;
  tenantId: string;
  customerId: string;
  projectId: string | null;
  month: string;
  status: MonthlyReportStatus;
  aiDraft: string | null;
  finalContent: string;
  sections: string;
  pdfUrl: string | null;
  h5Url: string | null;
  pushedAt: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const reportsApi = {
  list(customerId?: string) {
    return http.get<{ data: MonthlyReport[] }>('/reports', {
      params: customerId ? { customerId } : undefined,
    });
  },
  get(id: string) {
    return http.get<{ data: MonthlyReport }>(`/reports/${id}`);
  },
  generate(customerId: string, month: string) {
    return http.post<{ data: MonthlyReport }>('/reports/generate', { customerId, month });
  },
  update(id: string, body: { finalContent?: string }) {
    return http.patch<{ data: MonthlyReport }>(`/reports/${id}`, body);
  },
  publish(id: string) {
    return http.post<{ data: MonthlyReport }>(`/reports/${id}/publish`, {});
  },
};

export interface HealthScore {
  id: string;
  customerId: string;
  month: string;
  totalScore: number;
  businessScore: number;
  deliveryScore: number;
  npsScore: number;
  interactionScore: number;
  complaintScore: number;
  level: 'green' | 'yellow' | 'red';
}

export const healthScoreApi = {
  current(customerId: string) {
    return http.get<{ data: HealthScore }>(`/customers/${customerId}/health-score`);
  },
  history(customerId: string) {
    return http.get<{ data: HealthScore[] }>(`/customers/${customerId}/health-score/history`);
  },
};

export interface VideoMetric {
  id: string;
  videoId: string;
  platform: string;
  date: string;
  plays: number;
  likes: number;
  comments: number;
  shares: number;
  collections: number;
  adSpend: number;
  roi: number;
  anomalyFlag: number;
}

export const metricsApi = {
  byVideo(videoId: string) {
    return http.get<{ data: VideoMetric[] }>(`/metrics/videos/${videoId}`);
  },
  upsert(videoId: string, body: Omit<Partial<VideoMetric>, 'id' | 'videoId'> & { platform: string; date: string }) {
    return http.post<{ data: VideoMetric }>(`/metrics/videos/${videoId}`, body);
  },
  byCustomer(customerId: string, from?: string, to?: string) {
    return http.get<{ data: VideoMetric[] }>(`/metrics/customers/${customerId}`, {
      params: { from, to },
    });
  },
  aggregate(customerId: string, month: string) {
    return http.get<{
      data: {
        totalPlays: number; totalLikes: number; totalComments: number;
        totalShares: number; totalAdSpend: number; avgRoi: number;
        byVideo: Array<{ videoId: string; plays: number; roi: number }>;
      };
    }>(`/metrics/customers/${customerId}/aggregate`, { params: { month } });
  },
};

export const analyticsApi = {
  project(id: string) {
    return http.get<{ data: unknown }>(`/analytics/projects/${id}`);
  },
  customer(id: string) {
    return http.get<{
      data: {
        customer: { id: string; name: string; healthScore: number; healthLevel: string; stage: string } | null;
        trend: Array<{ month: string; plays: number; roi: number }>;
      };
    }>(`/analytics/customers/${id}`);
  },
  company() {
    return http.get<{
      data: {
        customers: { total: number; active: number; byStage: Record<string, number> };
        contracts: { total: number; signed: number };
        thisMonth: { incomeCents: number };
        tasks: { overdue: number };
      };
    }>('/analytics/company');
  },
};

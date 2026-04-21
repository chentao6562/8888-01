import { request, setToken } from './http';

export interface ClientSession {
  accessToken: string;
  expiresIn: number;
  customer: { id: string; name: string; phone: string };
}

export interface WechatLoginResult {
  needBind: boolean;
  tempToken?: string;
  session?: ClientSession;
}

export async function wechatLogin(code: string): Promise<WechatLoginResult> {
  return request('/client/auth/wechat-login', { method: 'POST', body: { code }, auth: false });
}

export async function bindPhone(tempToken: string, phone: string, verifyCode?: string): Promise<ClientSession> {
  const session = await request<ClientSession>('/client/auth/bind-phone', {
    method: 'POST', body: { tempToken, phone, verifyCode }, auth: false,
  });
  setToken(session.accessToken);
  return session;
}

export async function devLogin(phone: string): Promise<ClientSession> {
  const session = await request<ClientSession>('/client/auth/dev-login', {
    method: 'POST', body: { phone }, auth: false,
  });
  setToken(session.accessToken);
  return session;
}

export async function fetchMe() {
  return request('/client/me');
}

export interface DashboardData {
  metrics: { plays: number; revenueHint: string; roi: number };
  todos: {
    pendingReviews: Array<{ id: string; title: string; submittedAt: string | null }>;
    unreadReports: Array<{ id: string; month: string }>;
    pendingPayments: Array<{ id: string; stage: string; amount: number; dueAt: string | null }>;
  };
  recentVideos: Array<{ id: string; title: string; coverUrl: string | null; publishedAt: string }>;
  latestReport: { id: string; month: string; status: string } | null;
  renewal: { id: string; stage: string; expiresAt: string } | null;
}

export async function fetchDashboard(): Promise<DashboardData> {
  return request('/client/dashboard');
}

export interface Video {
  id: string;
  title: string;
  status: string;
  draftVideoUrl: string | null;
  coverUrl: string | null;
  reviewSubmittedAt: string | null;
}

export interface VideoComment {
  id: string;
  timestamp: number;
  text: string;
  author: string;
  createdAt: string;
}

export async function fetchPendingVideos(): Promise<Video[]> {
  return request('/client/videos/pending-review');
}

export async function fetchVideoDetail(id: string): Promise<{ video: Video; comments: VideoComment[] }> {
  return request(`/client/videos/${id}`);
}

export async function addVideoComment(id: string, body: { timestamp: number; text: string; author?: string }) {
  return request(`/client/videos/${id}/comments`, { method: 'POST', body });
}

export async function reviewVideo(id: string, action: 'approve' | 'minor_change' | 'reshoot') {
  return request(`/client/videos/${id}/review`, { method: 'POST', body: { action } });
}

export interface Report {
  id: string; month: string; status: string;
  finalContent: string; sections: string;
  pushedAt: string | null; readAt: string | null;
}

export async function fetchReports(): Promise<Report[]> {
  return request('/client/reports');
}

export async function fetchReportDetail(id: string): Promise<Report> {
  return request(`/client/reports/${id}`);
}

export async function markReportRead(id: string) {
  return request(`/client/reports/${id}/read`, { method: 'POST', body: {} });
}

export async function submitNps(body: { reportId?: string; score: number; comment?: string }) {
  return request('/client/nps', { method: 'POST', body });
}

export async function fileComplaint(body: { severity?: 'low' | 'mid' | 'high'; content: string }) {
  return request('/client/complaints', { method: 'POST', body });
}

export async function fetchContracts() {
  return request('/client/contracts');
}

export async function currentRenewal() {
  return request('/client/renewals/current');
}

export async function bookRenewalConsult(id: string) {
  return request(`/client/renewals/${id}/book-consult`, { method: 'POST', body: {} });
}

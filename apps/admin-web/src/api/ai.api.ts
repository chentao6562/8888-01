import { http } from './http';

export type Dialect = 'standard' | 'hohhot' | 'dongbei';
export type CopyFramework = 'story' | 'contrast' | 'dryGoods';

export interface CopywritingResult {
  hook: string;
  body: string;
  cta: string;
  provider: string;
  latencyMs: number;
}

export interface TitleCandidate {
  title: string;
  ctrScore: number;
}

export interface LlmUsage {
  used: number;
  limit: number;
  provider: string;
}

export const aiApi = {
  copywriting(body: {
    sellingPoint: string;
    evidence?: string[];
    framework?: CopyFramework;
    dialect?: Dialect;
  }) {
    return http.post<{ data: CopywritingResult }>('/ai/copywriting', body);
  },
  titles(body: { summary: string; dialect?: Dialect }) {
    return http.post<{ data: TitleCandidate[] }>('/ai/titles', body);
  },
  tags(body: { platform: string; content: string; industry?: string }) {
    return http.post<{ data: string[] }>('/ai/tags', body);
  },
  dialectAdapt(body: { text: string; dialect: Dialect }) {
    return http.post<{ data: { text: string; dialect: Dialect; provider: string } }>(
      '/ai/dialect-adapt',
      body,
    );
  },
  sensitiveCheck(text: string) {
    return http.post<{ data: { clean: boolean; hits: string[] } }>(
      '/ai/sensitive-check',
      { text },
    );
  },
  usage() {
    return http.get<{ data: LlmUsage }>('/ai/usage');
  },
};

export type CaseCategory = 'copy' | 'scene' | 'bgm' | 'title' | 'tag' | 'campaign';

export interface Case {
  id: string;
  tenantId: string | null;
  category: CaseCategory;
  title: string;
  content: string;
  industry: string | null;
  tags: string | null;
  metrics: string | null;
  callCount: number;
  lastCalledAt: string | null;
  freshness: 'fresh' | 'aging' | 'stale';
  createdAt: string;
  updatedAt: string;
}

export const casesApi = {
  list(params: { category?: CaseCategory; search?: string } = {}) {
    return http.get<{ data: Case[] }>('/cases', { params });
  },
  get(id: string) {
    return http.get<{ data: Case }>(`/cases/${id}`);
  },
  create(body: {
    category: CaseCategory;
    title: string;
    content: string;
    industry?: string;
    tags?: string[];
  }) {
    return http.post<{ data: Case }>('/cases', body);
  },
  remove(id: string) {
    return http.delete<unknown>(`/cases/${id}`);
  },
};

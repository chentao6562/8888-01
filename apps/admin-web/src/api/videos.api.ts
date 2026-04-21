import { http } from './http';

export type VideoStatus =
  | 'planning'
  | 'shooting'
  | 'editing'
  | 'pending_review'
  | 'approved'
  | 'minor_change'
  | 'reshoot'
  | 'pending_publish'
  | 'published'
  | 'offline';

export interface Video {
  id: string;
  tenantId: string;
  projectId: string;
  customerId: string;
  title: string;
  script: string | null;
  status: VideoStatus;
  strategistId: string | null;
  creatorId: string | null;
  editorId: string | null;
  adopsId: string | null;
  rawMaterialUrls: string | null;
  draftVideoUrl: string | null;
  finalVideoUrl: string | null;
  coverUrl: string | null;
  copywriting: string | null;
  titles: string | null;
  tags: string | null;
  reviewSubmittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const videosApi = {
  list(params: { projectId?: string; status?: VideoStatus } = {}) {
    return http.get<{ data: Video[] }>('/videos', { params });
  },
  get(id: string) {
    return http.get<{ data: Video }>(`/videos/${id}`);
  },
  create(body: { projectId: string; customerId: string; title: string; script?: string }) {
    return http.post<{ data: Video }>('/videos', body);
  },
  update(id: string, patch: Partial<Video>) {
    return http.patch<{ data: Video }>(`/videos/${id}`, patch);
  },
  transition(id: string, to: VideoStatus) {
    return http.post<{ data: Video }>(`/videos/${id}/transition`, { to });
  },
  submitForReview(id: string) {
    return http.post<{ data: Video }>(`/videos/${id}/submit-for-review`, {});
  },
};

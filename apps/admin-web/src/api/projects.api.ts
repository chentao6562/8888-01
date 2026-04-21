import { http } from './http';

export type ProjectStatus = 'kickoff' | 'running' | 'at_risk' | 'completed' | 'aborted';

export interface Project {
  id: string;
  tenantId: string;
  customerId: string;
  contractId: string;
  name: string;
  plan: string;
  status: ProjectStatus;
  startAt: string | null;
  endAt: string | null;
  pmId: string | null;
  goals: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KickoffMeeting {
  id: string;
  tenantId: string;
  projectId: string;
  meetingAt: string | null;
  goals: string | null;
  roles: string | null;
  schedule: string | null;
  risks: string | null;
  communicationRule: string | null;
  initialTasks: string | null;
  status: 'drafting' | 'finalized';
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export const projectsApi = {
  list(status?: ProjectStatus) {
    return http.get<{ data: Project[] }>('/projects', {
      params: status ? { status } : undefined,
    });
  },
  get(id: string) {
    return http.get<{ data: Project }>(`/projects/${id}`);
  },
  create(body: { contractId: string; name?: string; startAt?: string; endAt?: string }) {
    return http.post<{ data: Project }>('/projects', body);
  },
  transition(id: string, to: ProjectStatus) {
    return http.post<{ data: Project }>(`/projects/${id}/transition`, { to });
  },

  // Kickoff
  listKickoffs(projectId: string) {
    return http.get<{ data: KickoffMeeting[] }>(`/projects/${projectId}/kickoffs`);
  },
  createKickoff(projectId: string, body: Partial<KickoffMeeting>) {
    return http.post<{ data: KickoffMeeting }>(`/projects/${projectId}/kickoffs`, body);
  },
  updateKickoff(id: string, body: Partial<KickoffMeeting>) {
    return http.patch<{ data: KickoffMeeting }>(`/kickoffs/${id}`, body);
  },
  finalizeKickoff(id: string) {
    return http.post<{
      data: { kickoff: KickoffMeeting; tasksCreated: number };
    }>(`/kickoffs/${id}/finalize`, {});
  },
};

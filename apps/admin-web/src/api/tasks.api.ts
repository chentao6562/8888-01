import { http } from './http';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'pending_review'
  | 'done'
  | 'rework'
  | 'overdue';

export interface Task {
  id: string;
  tenantId: string;
  projectId: string;
  videoId: string | null;
  type: string;
  title: string;
  description: string | null;
  assigneeId: string;
  status: TaskStatus;
  dueAt: string | null;
  completedAt: string | null;
  escalatedLevel: number;
  createdAt: string;
  updatedAt: string;
}

export const tasksApi = {
  list(params: { projectId?: string; assigneeId?: string; status?: TaskStatus } = {}) {
    return http.get<{ data: Task[] }>('/tasks', { params });
  },
  mine() {
    return http.get<{ data: Task[] }>('/tasks/mine');
  },
  get(id: string) {
    return http.get<{ data: Task }>(`/tasks/${id}`);
  },
  create(body: {
    projectId: string;
    assigneeId: string;
    title: string;
    description?: string;
    dueAt?: string;
    type?: string;
  }) {
    return http.post<{ data: Task }>('/tasks', body);
  },
  transition(id: string, to: TaskStatus) {
    return http.post<{ data: Task }>(`/tasks/${id}/transition`, { to });
  },
};

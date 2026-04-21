import { http } from './http';
import type { Staff, StaffRole, StaffStatus } from './types';

export const staffApi = {
  list() {
    return http.get<{ data: Staff[] }>('/staff');
  },
  invite(body: {
    name: string;
    phone: string;
    email?: string;
    role: Exclude<StaffRole, 'admin'>;
  }) {
    return http.post<{ data: Staff & { inviteLink: string; inviteToken: string } }>(
      '/staff/invite',
      body,
    );
  },
  update(id: string, body: { role?: StaffRole; status?: Exclude<StaffStatus, 'invited'> }) {
    return http.patch<{ data: Staff }>(`/staff/${id}`, body);
  },
  remove(id: string) {
    return http.delete<unknown>(`/staff/${id}`);
  },
};

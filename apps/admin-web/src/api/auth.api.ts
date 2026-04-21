import { http } from './http';
import type { StaffRole } from './types';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    staffId: string;
    tenantId: string;
    name: string;
    role: StaffRole;
    phone: string;
  };
}

export interface MeSnapshot {
  userId: string;
  staff: { id: string; name: string; phone: string; role: StaffRole; status: string } | null;
  tenant: { id: string; name: string; plan: string; maxStaff: number } | null;
}

export const authApi = {
  registerTenant(body: {
    companyName: string;
    plan: 'basic' | 'pro' | 'enterprise';
    adminName: string;
    phone: string;
    password: string;
    contactEmail?: string;
  }) {
    return http.post<{ data: AuthSession }>('/auth/register-tenant', body);
  },
  login(phone: string, password: string) {
    return http.post<{ data: AuthSession }>('/auth/login', { phone, password });
  },
  refresh(refreshToken: string) {
    return http.post<{ data: { accessToken: string; refreshToken: string; expiresIn: number } }>(
      '/auth/refresh',
      { refreshToken },
    );
  },
  acceptInvite(token: string, password: string) {
    return http.post<{ data: AuthSession }>('/auth/accept-invite', { token, password });
  },
  me() {
    return http.get<{ data: MeSnapshot }>('/auth/me');
  },
  logout() {
    return http.post<unknown>('/auth/logout');
  },
};

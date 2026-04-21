import { http } from './http';
import type { Tenant } from './types';

export const tenantsApi = {
  current() {
    return http.get<{ data: Tenant }>('/tenants/current');
  },
  update(body: Partial<Pick<Tenant, 'name' | 'logo' | 'contactPhone' | 'contactEmail'>>) {
    return http.patch<{ data: Tenant }>('/tenants/current', body);
  },
};

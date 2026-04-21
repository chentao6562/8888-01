import { http } from './http';

export type PackageTier = 'starter_pack' | 'monthly_package' | 'annual_partner';

export interface Package {
  id: string;
  tenantId: string | null;
  tier: PackageTier;
  name: string;
  description: string;
  priceMin: number;
  priceMax: number;
  periodMonths: number;
}

export interface PositioningBook {
  id: string;
  tenantId: string;
  customerId: string;
  diagnosisReportId: string | null;
  version: number;
  onePager: string | null;
  content: string;
  packageId: string | null;
  planTier: PackageTier;
  priceQuote: number;
  regionFactor: number;
  customItems: string | null;
  status: 'draft' | 'final' | 'signed';
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const proposalsApi = {
  listPackages() {
    return http.get<{ data: Package[] }>('/packages');
  },
  recommendPackage(customerId: string) {
    return http.get<{ data: Package | null }>(
      `/customers/${customerId}/package-recommendation`,
    );
  },
  calculateQuote(body: {
    planTier: PackageTier;
    regionFactor?: number;
    customItems?: { name: string; amount: number }[];
  }) {
    return http.post<{
      data: { planTier: PackageTier; base: number; custom: number; total: number };
    }>('/proposals/calculate-quote', body);
  },
  listForCustomer(customerId: string) {
    return http.get<{ data: PositioningBook[] }>(`/customers/${customerId}/proposals`);
  },
  create(customerId: string, body: { planTier: PackageTier; packageId?: string; regionFactor?: number }) {
    return http.post<{ data: PositioningBook }>(
      `/customers/${customerId}/proposals`,
      body,
    );
  },
  update(id: string, patch: Partial<PositioningBook>) {
    return http.patch<{ data: PositioningBook }>(`/proposals/${id}`, patch);
  },
  get(id: string) {
    return http.get<{ data: PositioningBook }>(`/proposals/${id}`);
  },
  finalize(id: string) {
    return http.post<{ data: PositioningBook }>(`/proposals/${id}/finalize`, {});
  },
  sign(id: string) {
    return http.post<{ data: PositioningBook }>(`/proposals/${id}/sign`, {});
  },
};

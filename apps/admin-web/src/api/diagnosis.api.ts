import { http } from './http';

export interface DiagnosisReport {
  id: string;
  tenantId: string;
  customerId: string;
  strategistId: string | null;
  preInterviewContent: string | null;
  preInterviewAnswers: string | null;
  knifeSelf: string | null;
  knifeEmployee: string | null;
  knifeOldCustomer: string | null;
  knifeCompetitor: string | null;
  card1Sells: string | null;
  card2CustomerMind: string | null;
  card3ProductVideo: string | null;
  card4WhyNotNext: string | null;
  reportContent: string | null;
  status: 'drafting' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export const diagnosisApi = {
  get(customerId: string) {
    return http.get<{ data: DiagnosisReport }>(`/customers/${customerId}/diagnosis`);
  },
  create(customerId: string) {
    return http.post<{ data: DiagnosisReport }>(`/customers/${customerId}/diagnosis`, {});
  },
  update(customerId: string, patch: Partial<DiagnosisReport>) {
    return http.patch<{ data: DiagnosisReport }>(`/customers/${customerId}/diagnosis`, patch);
  },
  generateInterview(customerId: string) {
    return http.post<{ data: DiagnosisReport }>(
      `/customers/${customerId}/diagnosis/interview`,
      {},
    );
  },
  generateReport(customerId: string) {
    return http.post<{ data: DiagnosisReport }>(
      `/customers/${customerId}/diagnosis/generate-report`,
      {},
    );
  },
  complete(customerId: string) {
    return http.post<{ data: DiagnosisReport }>(
      `/customers/${customerId}/diagnosis/complete`,
      {},
    );
  },
};

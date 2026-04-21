import { http } from './http';

export type ContractStatus =
  | 'draft'
  | 'pending_sign'
  | 'signed'
  | 'executing'
  | 'completed'
  | 'renewed'
  | 'terminated';

export type PaymentStage = 'plan' | 'shoot' | 'edit' | 'final';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';

export interface Contract {
  id: string;
  tenantId: string;
  customerId: string;
  proposalId: string | null;
  projectId: string | null;
  contractNo: string;
  totalAmount: number;
  status: ContractStatus;
  bodySnapshot: string;
  signedAt: string | null;
  esignOrderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  contractId: string;
  customerId: string;
  stage: PaymentStage;
  ratio: number;
  amount: number;
  dueAt: string | null;
  status: PaymentStatus;
  paidAt: string | null;
  voucherUrl: string | null;
  notes: string | null;
}

export interface ContractTemplate {
  id: string;
  tenantId: string | null;
  tier: 'starter_pack' | 'monthly_package' | 'annual_partner';
  name: string;
  body: string;
}

export const contractsApi = {
  list(status?: ContractStatus) {
    return http.get<{ data: Contract[] }>('/contracts', {
      params: status ? { status } : undefined,
    });
  },
  get(id: string) {
    return http.get<{ data: Contract }>(`/contracts/${id}`);
  },
  payments(id: string) {
    return http.get<{ data: Payment[] }>(`/contracts/${id}/payments`);
  },
  create(body: { proposalId: string; templateId?: string; totalAmount?: number }) {
    return http.post<{ data: { contract: Contract; payments: Payment[] } }>(
      '/contracts',
      body,
    );
  },
  update(id: string, body: { bodySnapshot?: string; totalAmount?: number }) {
    return http.patch<{ data: Contract }>(`/contracts/${id}`, body);
  },
  sendForSign(id: string) {
    return http.post<{ data: { contract: Contract; orderId: string; signUrl: string } }>(
      `/contracts/${id}/send-for-signing`,
      {},
    );
  },
  /** mock 下可任意人调；phase 8 换真实 provider 时本端点不再从前端调 */
  esignCallback(id: string, body: { tenantId: string; orderId: string; signed: boolean }) {
    return http.post<{ data: Contract }>(`/contracts/${id}/esign-callback`, body);
  },
  registerPayment(
    contractId: string,
    paymentId: string,
    body: { idempotencyKey: string; voucherUrl?: string; notes?: string },
  ) {
    return http.post<{ data: Payment }>(
      `/contracts/${contractId}/payments/${paymentId}/register`,
      body,
    );
  },
  listTemplates() {
    return http.get<{ data: ContractTemplate[] }>('/contract-templates');
  },
};

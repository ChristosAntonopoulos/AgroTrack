import api from './api';

export type FinancialTransactionType = 'income' | 'expense';
export type FinancialTransactionStatus = 'draft' | 'posted' | 'void';

export interface FinancialTransaction {
  id: string;
  ownerUserId: string;
  type: FinancialTransactionType;
  typeLabel: string;
  status: FinancialTransactionStatus;
  statusLabel: string;
  amount: number;
  currency: string;
  occurredOn: string;
  resultYear: number;
  fieldId?: string | null;
  category?: string;
  categoryLabel?: string;
  description: string;
  paymentMethod?: string;
  counterpartyName?: string;
  relatedTaskId?: string;
  relatedHarvestId?: string;
  relatedCollaboratorId?: string;
  sourceType: string;
  sourceTypeLabel: string;
  sourceId?: string;
  attachmentIds: string[];
  notes?: string;
  productKind?: string | null;
  quantity?: number | null;
  quantityUnit?: string | null;
  quantityUnitLabel?: string | null;
  quantityUnitAbbreviation?: string | null;
  unitPrice?: number | null;
  calculationMode?: string;
  amountIsCalculated?: boolean;
  unitPriceIsCalculated?: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  postedAt?: string;
  voidedAt?: string;
  voidReason?: string;
  voidedByUserId?: string;
}

export interface CreateFinancialTransactionInput {
  type: FinancialTransactionType;
  amount: number;
  currency?: string;
  occurredOn?: string;
  resultYear?: number;
  fieldId?: string;
  category?: string;
  description: string;
  paymentMethod?: string;
  counterpartyName?: string;
  relatedTaskId?: string;
  relatedHarvestId?: string;
  relatedCollaboratorId?: string;
  sourceType?: string;
  sourceId?: string;
  attachmentIds?: string[];
  notes?: string;
  idempotencyKey?: string;
  saveAsDraft?: boolean;
  productKind?: string;
  quantity?: number;
  quantityUnit?: string;
  unitPrice?: number;
  calculationMode?: string;
}

export interface FinancialTransactionList {
  items: FinancialTransaction[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export const financialTransactionService = {
  create: async (
    input: CreateFinancialTransactionInput,
    idempotencyKey?: string
  ): Promise<FinancialTransaction> => {
    const key = input.idempotencyKey || idempotencyKey;
    const response = await api.post<FinancialTransaction>('/api/v1/financial-transactions', input, {
      headers: key ? { 'Idempotency-Key': key } : undefined,
    });
    return response.data;
  },

  getById: async (id: string): Promise<FinancialTransaction> => {
    const response = await api.get<FinancialTransaction>(`/api/v1/financial-transactions/${id}`);
    return response.data;
  },

  list: async (params: {
    resultYear?: number;
    fieldId?: string;
    type?: FinancialTransactionType;
    status?: FinancialTransactionStatus;
    category?: string;
    month?: number;
    relatedTaskId?: string;
    relatedHarvestId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<FinancialTransactionList> => {
    const response = await api.get<FinancialTransactionList>('/api/v1/financial-transactions', { params });
    return response.data;
  },

  void: async (id: string, reason: string): Promise<FinancialTransaction> => {
    const response = await api.post<FinancialTransaction>(`/api/v1/financial-transactions/${id}/void`, {
      reason,
    });
    return response.data;
  },

  deleteDraft: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/financial-transactions/${id}`);
  },

  post: async (id: string): Promise<FinancialTransaction> => {
    const response = await api.post<FinancialTransaction>(`/api/v1/financial-transactions/${id}/post`);
    return response.data;
  },

  update: async (
    id: string,
    input: Partial<CreateFinancialTransactionInput> & { clearField?: boolean }
  ): Promise<FinancialTransaction> => {
    const response = await api.put<FinancialTransaction>(`/api/v1/financial-transactions/${id}`, input);
    return response.data;
  },
};

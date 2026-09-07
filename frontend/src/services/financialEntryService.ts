import api from './api';

export type FinancialEntryKind = 'expense' | 'income';
export type FinancialEntryStatus = 'posted' | 'voided';
export type FinancialBucket = 'labor' | 'inputs' | 'harvest' | 'other';

export interface FinancialEntry {
  id: string;
  fieldId: string;
  lifecycleYear: string;
  taskId?: string;
  harvestId?: string;
  kind: FinancialEntryKind;
  amount: number;
  currency: string;
  description: string;
  bucket?: FinancialBucket;
  category?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  occurredOn: string;
  status: FinancialEntryStatus;
  recordedBy: string;
  notes?: string;
  voidReason?: string;
  voidedAt?: string;
  voidedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FieldFinancialSummary {
  fieldId: string;
  currency: string;
  lifecycleYear?: string;
  totalExpenses: number;
  totalIncome: number;
  net: number;
  postedCount: number;
  thisWeekExpenses: number;
  expensesByBucket: Record<string, number>;
}

export interface FinancialOverview {
  currency: string;
  thisWeekExpenses: number;
  totalExpenses: number;
  totalIncome: number;
  net: number;
  postedCount: number;
  fieldCount: number;
  topFields: Array<{ fieldId: string; fieldName: string; thisWeekExpenses: number }>;
}

export interface CreateFinancialEntryInput {
  fieldId: string;
  amount?: number;
  description: string;
  currency?: string;
  kind?: FinancialEntryKind;
  bucket?: FinancialBucket;
  category?: string;
  taskId?: string;
  lifecycleYear?: string;
  occurredOn?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  notes?: string;
}

export const financialEntryService = {
  listByField: async (fieldId: string, includeVoided = false): Promise<FinancialEntry[]> => {
    const response = await api.get<FinancialEntry[]>('/api/v1/financial-entries', {
      params: { fieldId, includeVoided },
    });
    return response.data;
  },

  getSummary: async (fieldId: string, lifecycleYear?: string): Promise<FieldFinancialSummary> => {
    const response = await api.get<FieldFinancialSummary>('/api/v1/financial-entries/summary', {
      params: { fieldId, lifecycleYear },
    });
    return response.data;
  },

  getOverview: async (): Promise<FinancialOverview> => {
    const response = await api.get<FinancialOverview>('/api/v1/financial-entries/overview');
    return response.data;
  },

  create: async (input: CreateFinancialEntryInput): Promise<FinancialEntry> => {
    const response = await api.post<FinancialEntry>('/api/v1/financial-entries', input);
    return response.data;
  },

  void: async (id: string, reason?: string): Promise<FinancialEntry> => {
    const response = await api.post<FinancialEntry>(`/api/v1/financial-entries/${id}/void`, { reason });
    return response.data;
  },
};

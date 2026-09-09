import api from './api';

export type FinancialBucket = 'labor' | 'inputs' | 'harvest' | 'other';

export interface FinancialEntry {
  id: string;
  fieldId: string;
  lifecycleYear?: string;
  kind: 'expense' | 'income';
  amount: number;
  currency: string;
  description: string;
  bucket?: FinancialBucket;
  category?: string;
  taskId?: string;
  harvestId?: string;
  notes?: string;
  recordedBy?: string;
  occurredOn: string;
  status: 'posted' | 'voided';
}

export interface FieldFinancialSummary {
  fieldId: string;
  currency: string;
  totalExpenses: number;
  totalIncome?: number;
  net?: number;
  thisWeekExpenses: number;
  postedCount: number;
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
  amount: number;
  description: string;
  currency?: string;
  kind?: 'expense' | 'income';
  bucket?: FinancialBucket;
  category?: string;
  taskId?: string;
  lifecycleYear?: string;
  occurredOn?: string;
}

export interface UpdateFinancialEntryInput {
  amount?: number;
  description?: string;
  bucket?: FinancialBucket;
  category?: string;
  occurredOn?: string;
  notes?: string;
}

export const financialEntryService = {
  listByField: async (fieldId: string): Promise<FinancialEntry[]> => {
    const response = await api.get<FinancialEntry[]>('/api/v1/financial-entries', {
      params: { fieldId },
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

  update: async (id: string, input: UpdateFinancialEntryInput): Promise<FinancialEntry> => {
    const response = await api.patch<FinancialEntry>(`/api/v1/financial-entries/${id}`, input);
    return response.data;
  },

  void: async (id: string, reason?: string): Promise<FinancialEntry> => {
    const response = await api.post<FinancialEntry>(`/api/v1/financial-entries/${id}/void`, {
      reason,
    });
    return response.data;
  },
};

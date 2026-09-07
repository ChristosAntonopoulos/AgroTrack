import api from './api';

export interface HarvestRecord {
  id: string;
  fieldId: string;
  harvestDate: string;
  harvestMethod: string;
  workersUsed: number;
  oliveKg: number;
  millName?: string;
  oilKg?: number;
  oilYieldPercent?: number;
  qualityGrade: string;
  notes?: string;
  status: 'posted' | 'voided';
  voidReason?: string;
  voidedAt?: string;
}

export interface CreateHarvestRecordInput {
  fieldId: string;
  harvestDate?: string;
  oliveKg: number;
  harvestMethod?: string;
  workersUsed?: number;
  millName?: string;
  oilKg?: number;
  oilYieldPercent?: number;
  qualityGrade?: string;
  notes?: string;
  saleAmount?: number;
  millCost?: number;
}

export const harvestService = {
  listByField: async (fieldId: string): Promise<HarvestRecord[]> => {
    const response = await api.get<HarvestRecord[]>('/api/v1/harvest-records', {
      params: { fieldId },
    });
    return response.data;
  },

  create: async (input: CreateHarvestRecordInput): Promise<HarvestRecord> => {
    const response = await api.post<HarvestRecord>('/api/v1/harvest-records', input);
    return response.data;
  },

  void: async (id: string, reason?: string): Promise<HarvestRecord> => {
    const response = await api.post<HarvestRecord>(`/api/v1/harvest-records/${id}/void`, {
      reason,
    });
    return response.data;
  },
};

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
  oilLitres?: number | null;
  conversionFactor?: number | null;
  conversionSource?: string | null;
  conversionRecordedAt?: string | null;
  oilYieldPercent?: number;
  qualityGrade: string;
  notes?: string;
  status?: 'posted' | 'voided';
  voidReason?: string;
  voidedAt?: string;
}

export interface CreateHarvestInput {
  fieldId: string;
  harvestDate?: string;
  harvestMethod?: string;
  workersUsed?: number;
  oliveKg: number;
  millName?: string;
  oilKg?: number;
  oilLitres?: number;
  conversionFactor?: number;
  conversionSource?: string;
  conversionRecordedAt?: string;
  oilYieldPercent?: number;
  qualityGrade?: string;
  saleAmount?: number;
  millCost?: number;
  notes?: string;
  mediaUrls?: string[];
}

export const harvestService = {
  listByField: async (fieldId: string): Promise<HarvestRecord[]> => {
    const response = await api.get<HarvestRecord[]>('/api/v1/harvest-records', { params: { fieldId } });
    return response.data;
  },

  create: async (input: CreateHarvestInput): Promise<HarvestRecord> => {
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

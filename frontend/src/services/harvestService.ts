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
}

export interface CreateHarvestInput {
  fieldId: string;
  harvestDate?: string;
  harvestMethod?: string;
  workersUsed?: number;
  oliveKg: number;
  millName?: string;
  oilKg?: number;
  saleAmount?: number;
  millCost?: number;
  notes?: string;
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
};

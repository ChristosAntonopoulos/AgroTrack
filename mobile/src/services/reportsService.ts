import api from './api';

export interface FieldSummaryReport {
  fieldId: string;
  fieldName: string;
  areaHa: number;
  variety?: string;
  treeAge?: number;
  tasksCompleted: number;
  tasksPending: number;
  tasksOverdue: number;
  totalCost: number;
  totalProductionKg: number;
  yieldPerHa: number;
}

export interface HarvestReportRecord {
  id: string;
  fieldId: string;
  fieldName: string;
  harvestDate: string;
  oliveKg: number;
  oilKg?: number;
  millName?: string;
  status?: string;
}

export interface FieldProfit {
  fieldId: string;
  fieldName: string;
  cost: number;
  revenue: number;
  profit: number;
}

export interface ProfitLossReport {
  season: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitByField: FieldProfit[];
}

export type ReportQuery = {
  lifecycleYear?: string;
  season?: string;
};

const reportParams = (query?: ReportQuery) => ({
  params: {
    lifecycleYear: query?.lifecycleYear,
    season: query?.season,
  },
});

export const reportsService = {
  getFieldSummaries: async (query?: ReportQuery): Promise<FieldSummaryReport[]> => {
    const response = await api.get<FieldSummaryReport[]>(
      '/api/v1/reports/field-summaries',
      reportParams(query)
    );
    return response.data;
  },

  getHarvestRecords: async (query?: ReportQuery): Promise<HarvestReportRecord[]> => {
    const response = await api.get<HarvestReportRecord[]>(
      '/api/v1/reports/harvest-records',
      reportParams(query)
    );
    return response.data;
  },

  getProfitLoss: async (query?: ReportQuery): Promise<ProfitLossReport> => {
    const response = await api.get<ProfitLossReport>('/api/v1/reports/profit-loss', reportParams(query));
    return response.data;
  },

  getFieldComparison: async (query?: ReportQuery) => {
    const summaries = await reportsService.getFieldSummaries(query);
    return summaries.map((s) => ({
      fieldId: s.fieldId,
      fieldName: s.fieldName,
      oliveKg: s.totalProductionKg,
      kgPerHa: s.yieldPerHa,
      cost: s.totalCost,
      tasksCompleted: s.tasksCompleted,
      tasksPending: s.tasksPending,
      tasksOverdue: s.tasksOverdue,
    }));
  },
};

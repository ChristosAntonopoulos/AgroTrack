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

  getMonthlyWeather: async (query?: ReportQuery & { month?: number }): Promise<MonthlyWeatherReport> => {
    const response = await api.get<MonthlyWeatherReport>('/api/v1/reports/weather-month', {
      params: { ...reportParams(query).params, month: query?.month },
    });
    return response.data;
  },

  getYearlyWeather: async (query?: ReportQuery): Promise<YearlyWeatherReport> => {
    const response = await api.get<YearlyWeatherReport>('/api/v1/reports/weather-year', reportParams(query));
    return response.data;
  },
};

export type ReportInsight = { code: string; count?: number; value?: number };

export type DailyWeatherRow = {
  day: number;
  minTemperatureC?: number;
  maxTemperatureC?: number;
  rainTotalMm: number;
  et0Mm?: number;
};

export type FieldMonthlyWeather = {
  fieldId: string;
  fieldName: string;
  areaHa: number;
  rainTotalMm: number;
  frostNights: number;
  heatDays: number;
  heavyRainDays: number;
  longestDryStreakDays: number;
  waterBalanceMm: number;
  days: DailyWeatherRow[];
  insights: ReportInsight[];
};

export type MonthlyWeatherReport = {
  season: string;
  month: number;
  fields: FieldMonthlyWeather[];
};

export type FieldYearlyOperations = {
  fieldId: string;
  fieldName: string;
  rainTotalMm: number;
  totalCost: number;
  revenue: number;
  profit: number;
  tasksCompleted: number;
  tasksPending: number;
  tasksOverdue: number;
  monthlyRainMm: number[];
  monthlyCost: number[];
  monthlyTasksCompleted: number[];
  insights: ReportInsight[];
};

export type YearlyWeatherReport = {
  season: string;
  fields: FieldYearlyOperations[];
};

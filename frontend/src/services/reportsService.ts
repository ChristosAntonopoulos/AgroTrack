import api from './api';
import {
  FieldSummaryData,
  HarvestRecord,
  ProfitLossData,
  FieldComparisonRow,
} from '../data/mockReportData';
import { CATEGORY_TO_PNL_KEY, FINANCIAL_CATEGORIES } from '../data/financialCategories';

const seasonParams = (season?: string) => (season ? { params: { season } } : undefined);

export const reportsService = {
  getFieldSummaries: async (season?: string): Promise<FieldSummaryData[]> => {
    const response = await api.get<Array<{
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
    }>>('/api/v1/reports/field-summaries', seasonParams(season));

    return response.data.map((row) => ({
      fieldId: row.fieldId,
      fieldName: row.fieldName,
      location: '',
      areaHa: row.areaHa,
      treeCount: 0,
      treeAge: row.treeAge ?? 0,
      variety: row.variety ?? '',
      productionType: 'Oil' as const,
      irrigationType: '',
      soilType: '',
      lastPruningDate: '',
      lastSoilAnalysis: '',
      lastHarvestDate: '',
      tasksCompleted: row.tasksCompleted,
      tasksPending: row.tasksPending,
      tasksOverdue: row.tasksOverdue,
      totalProductionKg: row.totalProductionKg,
      yieldPerTree: 0,
      yieldPerHa: row.yieldPerHa,
      totalCost: Number(row.totalCost),
      costPerHa: row.areaHa > 0 ? Number(row.totalCost) / row.areaHa : 0,
      revenue: 0,
      profit: -Number(row.totalCost),
      issues: [],
      recommendations: [],
    }));
  },

  getHarvestRecords: async (season?: string): Promise<HarvestRecord[]> => {
    const response = await api.get<Array<{
      id: string;
      fieldId: string;
      fieldName: string;
      harvestDate: string;
      harvestMethod?: string;
      workersUsed?: number;
      oliveKg: number;
      kgPerHa?: number;
      millName?: string;
      oilKg?: number;
      oilYieldPercent?: number;
      qualityGrade?: string;
      notes?: string;
    }>>('/api/v1/reports/harvest-records', seasonParams(season));

    return response.data.map((row) => ({
      fieldId: row.fieldId,
      fieldName: row.fieldName,
      harvestDate: row.harvestDate,
      harvestMethod: row.harvestMethod,
      workersUsed: row.workersUsed,
      oliveKg: row.oliveKg,
      kgPerHa: row.kgPerHa,
      millName: row.millName,
      oilKg: row.oilKg,
      oilYieldPercent: row.oilYieldPercent,
      qualityGrade: row.qualityGrade || undefined,
      notes: row.notes,
    }));
  },

  getProfitLoss: async (season?: string): Promise<ProfitLossData> => {
    const response = await api.get<{
      season: string;
      totalIncome: number;
      totalExpenses: number;
      netProfit: number;
      profitByField: Array<{
        fieldId: string;
        fieldName: string;
        cost: number;
        revenue: number;
        profit: number;
      }>;
      expensesByBucket?: Record<string, number>;
      expensesByCategory?: Record<string, number>;
    }>('/api/v1/reports/profit-loss', seasonParams(season));

    const data = response.data;
    const totalIncome = Number(data.totalIncome);
    const totalExpenses = Number(data.totalExpenses);
    const netProfit = Number(data.netProfit);
    const buckets = data.expensesByBucket ?? {};
    const byCategory = data.expensesByCategory ?? {};
    const expenses = {
      labor: 0,
      fertilizers: 0,
      treatments: 0,
      irrigationWater: 0,
      electricityFuel: 0,
      equipment: 0,
      repairs: 0,
      pruning: 0,
      harvestWorkers: 0,
      millCost: 0,
      transport: 0,
      packaging: 0,
      storage: 0,
      agronomist: 0,
      other: 0,
    };
    let mapped = 0;
    for (const id of FINANCIAL_CATEGORIES) {
      const amount = Number(byCategory[id] || 0);
      if (amount <= 0) continue;
      const key = CATEGORY_TO_PNL_KEY[id] as keyof typeof expenses;
      expenses[key] += amount;
      mapped += amount;
    }
    if (mapped === 0) {
      expenses.labor = Number(buckets.labor || 0);
      expenses.electricityFuel = Number(buckets.inputs || 0);
      expenses.harvestWorkers = Number(buckets.harvest || 0);
      expenses.other = Number(buckets.other || 0);
      mapped = expenses.labor + expenses.electricityFuel + expenses.harvestWorkers + expenses.other;
    }
    expenses.other += Math.max(0, totalExpenses - mapped);
    const profitByField = data.profitByField.map((f) => ({
      fieldId: f.fieldId,
      fieldName: f.fieldName,
      profit: Number(f.profit),
      profitPerHa: 0,
      cost: Number(f.cost),
      revenue: Number(f.revenue),
    }));

    return {
      season: data.season,
      income: {
        oliveOilSales: totalIncome,
        tableOliveSales: 0,
        bulkOliveSales: 0,
        subsidies: 0,
        other: 0,
      },
      expenses,
      totalIncome,
      totalExpenses,
      netProfit,
      costPerKgOlives: 0,
      costPerKgOil: 0,
      revenuePerKgOil: 0,
      breakEvenPrice: 0,
      profitPerHa: 0,
      profitPerTree: 0,
      profitByField,
    };
  },

  getFieldComparison: async (season?: string): Promise<FieldComparisonRow[]> => {
    const summaries = await reportsService.getFieldSummaries(season);
    return summaries.map((s) => ({
      fieldId: s.fieldId,
      fieldName: s.fieldName,
      oliveKg: s.totalProductionKg,
      oilKg: s.oilProducedKg,
      oilYieldPercent: s.oilYieldPercent,
      kgPerTree: s.yieldPerTree || undefined,
      kgPerHa: s.yieldPerHa,
      costPerHa: s.costPerHa,
      profitPerHa: s.areaHa > 0 ? s.profit / s.areaHa : undefined,
      tasksCompleted: s.tasksCompleted,
      issueCount: s.issues.length || undefined,
    }));
  },
};

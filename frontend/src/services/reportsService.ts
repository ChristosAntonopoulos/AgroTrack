import api from './api';
import {
  FieldSummaryData,
  HarvestRecord,
  ProfitLossData,
  FieldComparisonRow,
} from '../data/mockReportData';

export const reportsService = {
  getFieldSummaries: async (): Promise<FieldSummaryData[]> => {
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
    }>>('/api/v1/reports/field-summaries');

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

  getHarvestRecords: async (): Promise<HarvestRecord[]> => {
    const response = await api.get<Array<{
      id: string;
      fieldId: string;
      fieldName: string;
      harvestDate: string;
      harvestMethod: string;
      workersUsed: number;
      oliveKg: number;
      kgPerHa: number;
      millName?: string;
      oilKg?: number;
      oilYieldPercent?: number;
      qualityGrade: string;
      notes?: string;
    }>>('/api/v1/reports/harvest-records');

    return response.data.map((row) => ({
      fieldId: row.fieldId,
      fieldName: row.fieldName,
      harvestDate: row.harvestDate,
      harvestMethod: row.harvestMethod,
      workersUsed: row.workersUsed,
      oliveKg: row.oliveKg,
      kgPerTree: 0,
      kgPerHa: row.kgPerHa,
      millName: row.millName ?? '',
      deliveryTime: '',
      oilKg: row.oilKg ?? 0,
      oilYieldPercent: row.oilYieldPercent ?? 0,
      qualityGrade: row.qualityGrade,
      rejectedKg: 0,
      notes: row.notes ?? '',
    }));
  },

  getProfitLoss: async (): Promise<ProfitLossData> => {
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
    }>('/api/v1/reports/profit-loss');

    const data = response.data;
    const totalIncome = Number(data.totalIncome);
    const totalExpenses = Number(data.totalExpenses);
    const netProfit = Number(data.netProfit);
    const profitByField = data.profitByField.map((f) => ({
      fieldId: f.fieldId,
      fieldName: f.fieldName,
      profit: Number(f.profit),
      profitPerHa: 0,
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
      expenses: {
        labor: totalExpenses,
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
      },
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

  getFieldComparison: async (): Promise<FieldComparisonRow[]> => {
    const summaries = await reportsService.getFieldSummaries();
    return summaries.map((s) => ({
      fieldId: s.fieldId,
      fieldName: s.fieldName,
      oliveKg: s.totalProductionKg,
      oilKg: s.oilProducedKg ?? 0,
      oilYieldPercent: s.oilYieldPercent ?? 0,
      kgPerTree: s.yieldPerTree,
      kgPerHa: s.yieldPerHa,
      costPerHa: s.costPerHa,
      profitPerHa: s.areaHa > 0 ? s.profit / s.areaHa : 0,
      tasksCompleted: s.tasksCompleted,
      issueCount: s.issues.length,
      pestPressure: 'Low' as const,
      waterUsageM3: 0,
    }));
  },
};

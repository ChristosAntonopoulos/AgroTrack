/** Report shapes returned by the live reports API. Mock fixtures live elsewhere. */

export type ReportTypeId =
  | 'weather-month'
  | 'weather-year'
  | 'year-overview'
  | 'agronomic'
  | 'farm-account'
  | 'traceability'
  | 'comparison'
  | 'work-register';

export interface FieldSummaryData {
  fieldId: string;
  fieldName: string;
  location: string;
  areaHa: number;
  treeCount: number;
  treeAge: number;
  variety: string;
  productionType: 'Oil' | 'Table' | 'Both';
  irrigationType: string;
  soilType: string;
  lastPruningDate: string;
  lastSoilAnalysis: string;
  lastHarvestDate: string;
  tasksCompleted: number;
  tasksPending: number;
  tasksOverdue: number;
  totalProductionKg: number;
  yieldPerTree: number;
  yieldPerHa: number;
  totalCost: number;
  costPerHa: number;
  revenue: number;
  profit: number;
  oilProducedKg?: number;
  oilYieldPercent?: number;
  issues: string[];
  recommendations: string[];
}

export interface HarvestRecord {
  id?: string;
  fieldId: string;
  fieldName: string;
  harvestDate: string;
  harvestMethod?: string;
  workersUsed?: number;
  oliveKg: number;
  kgPerTree?: number;
  kgPerHa?: number;
  millName?: string;
  deliveryTime?: string;
  oilKg?: number;
  oilLitres?: number;
  oilYieldPercent?: number;
  oilAcidity?: number;
  qualityGrade?: string;
  rejectedKg?: number;
  notes?: string;
}

export interface ProfitLossData {
  season: string;
  income: {
    oliveOilSales: number;
    tableOliveSales: number;
    bulkOliveSales: number;
    subsidies: number;
    other: number;
  };
  expenses: {
    labor: number;
    fertilizers: number;
    treatments: number;
    irrigationWater: number;
    electricityFuel: number;
    equipment: number;
    repairs: number;
    pruning: number;
    harvestWorkers: number;
    millCost: number;
    transport: number;
    packaging: number;
    storage: number;
    agronomist: number;
    other: number;
  };
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  costPerKgOlives: number;
  costPerKgOil: number;
  revenuePerKgOil: number;
  breakEvenPrice: number;
  profitPerHa: number;
  profitPerTree: number;
  profitByField: { fieldId: string; fieldName: string; profit: number; profitPerHa: number; cost?: number; revenue?: number }[];
  /** Posted receipts by ledger category, when the API classified them. */
  incomeByCategory?: Record<string, number>;
  /** Posted costs by ledger category, when the API classified them. */
  expensesByCategory?: Record<string, number>;
}

export interface FieldComparisonRow {
  fieldId: string;
  fieldName: string;
  oliveKg: number;
  oilKg?: number;
  oilYieldPercent?: number;
  kgPerTree?: number;
  kgPerHa?: number;
  costPerHa: number;
  profitPerHa?: number;
  tasksCompleted: number;
  issueCount?: number;
  pestPressure?: 'Low' | 'Medium' | 'High';
  waterUsageM3?: number;
}

export interface ComparisonInsights {
  bestYieldField: string;
  bestOilYieldField: string;
  mostProfitableField: string;
  mostExpensiveField: string;
  mostOverdueTasksField: string;
  highestPestField: string;
}

export type ReportInsight = { code: string; count?: number; value?: number };

export interface DailyWeatherRow {
  day: number;
  minTemperatureC?: number;
  maxTemperatureC?: number;
  rainTotalMm: number;
  et0Mm?: number;
}

export interface FieldMonthlyWeather {
  fieldId: string;
  fieldName: string;
  location: string;
  areaHa: number;
  dayCount: number;
  rainTotalMm: number;
  avgMinTemperatureC?: number;
  avgMaxTemperatureC?: number;
  minTemperatureC?: number;
  maxTemperatureC?: number;
  frostNights: number;
  heatDays: number;
  heavyRainDays: number;
  dryDays: number;
  rainyDays: number;
  longestDryStreakDays: number;
  rainVsPreviousPercent?: number;
  et0TotalMm: number;
  waterBalanceMm: number;
  ndviMean?: number;
  ndviDeltaPercent?: number;
  days: DailyWeatherRow[];
  insights: ReportInsight[];
}

export interface MonthlyWeatherReport {
  season: string;
  month: number;
  fields: FieldMonthlyWeather[];
}

export interface TaskTypeCount {
  type: string;
  completed: number;
  total: number;
  cost: number;
}

export interface FieldYearlyOperations {
  fieldId: string;
  fieldName: string;
  location: string;
  areaHa: number;
  rainTotalMm: number;
  minTemperatureC?: number;
  maxTemperatureC?: number;
  frostNights: number;
  heatDays: number;
  heavyRainDays: number;
  longestDryStreakDays: number;
  wettestMonth?: number;
  rainVsPreviousPercent?: number;
  ndviMean?: number;
  et0TotalMm?: number;
  /** Rainfall minus reference evapotranspiration. Absent when ET₀ was not recorded. */
  waterBalanceMm?: number | null;
  monthlyRainMm: number[];
  totalCost: number;
  revenue: number;
  profit: number;
  costPerHa: number;
  monthlyCost: number[];
  monthlyRevenue: number[];
  tasksCompleted: number;
  tasksPending: number;
  tasksOverdue: number;
  monthlyTasksCompleted: number[];
  tasksByType: TaskTypeCount[];
  insights: ReportInsight[];
}

export interface YearlyWeatherReport {
  season: string;
  fields: FieldYearlyOperations[];
}

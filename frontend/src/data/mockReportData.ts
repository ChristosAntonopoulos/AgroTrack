export type ReportTypeId = 'weather-month' | 'weather-year' | 'year-overview';

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

export const REPORT_TYPES: {
  id: ReportTypeId;
  icon: string;
  default?: boolean;
}[] = [
  { id: 'weather-month', icon: 'cloud-rain', default: true },
  { id: 'weather-year', icon: 'cloud-sun' },
  { id: 'year-overview', icon: 'leaf' },
];

export const MOCK_FIELD_SUMMARIES: FieldSummaryData[] = [
  {
    fieldId: 'field1',
    fieldName: 'North Olive Grove',
    location: 'Messenia, Greece',
    areaHa: 12.5,
    treeCount: 420,
    treeAge: 15,
    variety: 'Kalamata',
    productionType: 'Oil',
    irrigationType: 'Drip',
    soilType: 'Clay Loam',
    lastPruningDate: '2025-03-18',
    lastSoilAnalysis: '2025-04-02',
    lastHarvestDate: '2025-10-12',
    tasksCompleted: 47,
    tasksPending: 8,
    tasksOverdue: 3,
    totalProductionKg: 6300,
    yieldPerTree: 15.0,
    yieldPerHa: 504,
    totalCost: 3250,
    costPerHa: 260,
    revenue: 8400,
    profit: 5150,
    oilProducedKg: 1050,
    oilYieldPercent: 16.7,
    issues: [
      'Olive fruit fly pressure increased in September',
      'Two irrigation failures recorded in July',
      'Pruning overdue for 35% of trees',
    ],
    recommendations: [
      'Start fruit fly monitoring earlier next season',
      'Inspect irrigation filters every 2 weeks in summer',
      'Schedule pruning in March',
    ],
  },
  {
    fieldId: 'field2',
    fieldName: 'South Valley Fields',
    location: 'Messenia, Greece',
    areaHa: 8.3,
    treeCount: 280,
    treeAge: 8,
    variety: 'Arbequina',
    productionType: 'Oil',
    irrigationType: 'Sprinkler',
    soilType: 'Sandy Loam',
    lastPruningDate: '2025-02-22',
    lastSoilAnalysis: '2025-03-15',
    lastHarvestDate: '2025-10-08',
    tasksCompleted: 38,
    tasksPending: 5,
    tasksOverdue: 1,
    totalProductionKg: 4800,
    yieldPerTree: 17.1,
    yieldPerHa: 578,
    totalCost: 2130,
    costPerHa: 257,
    revenue: 7200,
    profit: 5070,
    oilProducedKg: 890,
    oilYieldPercent: 18.5,
    issues: [
      'Lower fruit load compared to last season',
      'Minor leaf spot detected in June',
    ],
    recommendations: [
      'Maintain current harvest timing — oil yield improved',
      'Apply preventive copper spray in spring',
    ],
  },
];

export const MOCK_HARVEST_RECORDS: HarvestRecord[] = [
  {
    fieldId: 'field1',
    fieldName: 'North Olive Grove',
    harvestDate: '2025-10-12',
    harvestMethod: 'Mechanical + hand finishing',
    workersUsed: 12,
    oliveKg: 6300,
    kgPerTree: 15.0,
    kgPerHa: 504,
    millName: 'Peloponnese Olive Mill',
    deliveryTime: '4 hours',
    oilKg: 1050,
    oilYieldPercent: 16.7,
    oilAcidity: 0.3,
    qualityGrade: 'Extra Virgin',
    rejectedKg: 85,
    notes: 'Good quality, slightly early harvest for higher polyphenols.',
  },
  {
    fieldId: 'field2',
    fieldName: 'South Valley Fields',
    harvestDate: '2025-10-08',
    harvestMethod: 'Hand harvest',
    workersUsed: 8,
    oliveKg: 4800,
    kgPerTree: 17.1,
    kgPerHa: 578,
    millName: 'Valley Cooperative Mill',
    deliveryTime: '2 hours',
    oilKg: 890,
    oilYieldPercent: 18.5,
    oilAcidity: 0.25,
    qualityGrade: 'Extra Virgin',
    rejectedKg: 42,
    notes: 'Fewer olives than last year but higher oil yield — lower fruit load, better oil accumulation.',
  },
];

export const MOCK_PROFIT_LOSS: ProfitLossData = {
  season: '2025',
  income: {
    oliveOilSales: 14000,
    tableOliveSales: 800,
    bulkOliveSales: 400,
    subsidies: 400,
    other: 0,
  },
  expenses: {
    labor: 1900,
    fertilizers: 980,
    treatments: 420,
    irrigationWater: 550,
    electricityFuel: 280,
    equipment: 350,
    repairs: 180,
    pruning: 420,
    harvestWorkers: 1200,
    millCost: 480,
    transport: 220,
    packaging: 150,
    storage: 90,
    agronomist: 200,
    other: 150,
  },
  totalIncome: 15600,
  totalExpenses: 5380,
  netProfit: 10220,
  costPerKgOlives: 0.42,
  costPerKgOil: 2.65,
  revenuePerKgOil: 7.8,
  breakEvenPrice: 3.4,
  profitPerHa: 2940,
  profitPerTree: 8.75,
  profitByField: [
    { fieldId: 'field1', fieldName: 'North Olive Grove', profit: 5150, profitPerHa: 412 },
    { fieldId: 'field2', fieldName: 'South Valley Fields', profit: 5070, profitPerHa: 611 },
  ],
};

export const MOCK_FIELD_COMPARISON: FieldComparisonRow[] = [
  {
    fieldId: 'field1',
    fieldName: 'North Olive Grove',
    oliveKg: 6300,
    oilKg: 1050,
    oilYieldPercent: 16.7,
    kgPerTree: 15.0,
    kgPerHa: 504,
    costPerHa: 260,
    profitPerHa: 412,
    tasksCompleted: 47,
    issueCount: 3,
    pestPressure: 'Medium',
    waterUsageM3: 420,
  },
  {
    fieldId: 'field2',
    fieldName: 'South Valley Fields',
    oliveKg: 4800,
    oilKg: 890,
    oilYieldPercent: 18.5,
    kgPerTree: 17.1,
    kgPerHa: 578,
    costPerHa: 257,
    profitPerHa: 611,
    tasksCompleted: 38,
    issueCount: 2,
    pestPressure: 'Low',
    waterUsageM3: 310,
  },
];

export const MOCK_COMPARISON_INSIGHTS: ComparisonInsights = {
  bestYieldField: 'South Valley Fields',
  bestOilYieldField: 'South Valley Fields',
  mostProfitableField: 'South Valley Fields',
  mostExpensiveField: 'North Olive Grove',
  mostOverdueTasksField: 'North Olive Grove',
  highestPestField: 'North Olive Grove',
};

export const HARVEST_INSIGHT =
  'South Valley Fields produced fewer olives than last year, but oil yield was higher. This may indicate lower fruit load but better oil accumulation.';

export function filterByFields<T extends { fieldId: string }>(
  items: T[],
  selectedFieldIds: string[]
): T[] {
  if (selectedFieldIds.length === 0) return items;
  return items.filter(item => selectedFieldIds.includes(item.fieldId));
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

function mockMonthDays(rainPeakDay = 12): DailyWeatherRow[] {
  return Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    const rain = day === rainPeakDay ? 28 : day % 7 === 0 ? 4.5 : day % 5 === 0 ? 1.2 : 0;
    return {
      day,
      minTemperatureC: 6 + (day % 4) * 0.5,
      maxTemperatureC: 16 + (day % 5),
      rainTotalMm: rain,
      et0Mm: 1.4 + (day % 3) * 0.2,
    };
  });
}

export const MOCK_MONTHLY_WEATHER: MonthlyWeatherReport = {
  season: '2024',
  month: 3,
  fields: [
    {
      fieldId: 'field1',
      fieldName: 'North Olive Grove',
      location: 'Messenia',
      areaHa: 12.5,
      dayCount: 31,
      rainTotalMm: 86.4,
      avgMinTemperatureC: 7.2,
      avgMaxTemperatureC: 17.8,
      minTemperatureC: 2.1,
      maxTemperatureC: 24.6,
      frostNights: 0,
      heatDays: 0,
      heavyRainDays: 2,
      dryDays: 18,
      rainyDays: 13,
      longestDryStreakDays: 9,
      rainVsPreviousPercent: 22,
      et0TotalMm: 54.2,
      waterBalanceMm: 32.2,
      ndviMean: 0.412,
      ndviDeltaPercent: 8.5,
      days: mockMonthDays(12),
      insights: [
        { code: 'heavyRain', count: 2 },
        { code: 'wetter', value: 22 },
        { code: 'waterSurplus', value: 32 },
      ],
    },
  ],
};

export const MOCK_YEARLY_WEATHER: YearlyWeatherReport = {
  season: '2024',
  fields: [
    {
      fieldId: 'field1',
      fieldName: 'North Olive Grove',
      location: 'Messenia',
      areaHa: 12.5,
      rainTotalMm: 612.4,
      minTemperatureC: -1.2,
      maxTemperatureC: 38.4,
      frostNights: 4,
      heatDays: 18,
      heavyRainDays: 7,
      longestDryStreakDays: 24,
      wettestMonth: 11,
      rainVsPreviousPercent: -12,
      ndviMean: 0.388,
      monthlyRainMm: [82, 64, 86, 41, 22, 8, 2, 4, 18, 54, 128, 103],
      totalCost: 18400,
      revenue: 24600,
      profit: 6200,
      costPerHa: 1472,
      monthlyCost: [900, 1100, 2400, 1800, 900, 600, 400, 500, 1200, 2100, 4300, 2200],
      monthlyRevenue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1800, 16200, 6600],
      tasksCompleted: 47,
      tasksPending: 8,
      tasksOverdue: 3,
      monthlyTasksCompleted: [2, 4, 8, 6, 4, 3, 2, 2, 3, 5, 6, 2],
      tasksByType: [
        { type: 'Pruning', completed: 6, total: 6, cost: 2400 },
        { type: 'Spray', completed: 9, total: 11, cost: 1800 },
        { type: 'Harvest', completed: 4, total: 4, cost: 6200 },
      ],
      insights: [
        { code: 'frost', count: 4 },
        { code: 'heat', count: 18 },
        { code: 'dryStreak', count: 24 },
        { code: 'overdueTasks', count: 3 },
        { code: 'profit', value: 6200 },
      ],
    },
  ],
};

export function formatCurrency(value: number, locale = 'el-GR'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `€${Math.round(value).toLocaleString()}`;
  }
}

export function formatNumber(value: number | undefined, decimals = 0, locale = 'el-GR'): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number | undefined, locale = 'el-GR'): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${formatNumber(value, 1, locale)}%`;
}

export function formatHa(value: number | undefined, locale = 'el-GR'): string {
  return `${formatNumber(value, 2, locale)} ha`;
}

export function formatMm(value: number | undefined, locale = 'el-GR'): string {
  return `${formatNumber(value, 1, locale)} mm`;
}

export function formatTemp(value: number | undefined, locale = 'el-GR'): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${formatNumber(value, 1, locale)} °C`;
}

export function displayOrDash(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—';
  return String(value);
}

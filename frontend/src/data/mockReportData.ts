export type ReportTypeId =
  | 'field-summary'
  | 'production-harvest'
  | 'profit-loss'
  | 'field-comparison';

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
  { id: 'field-summary', icon: 'leaf', default: true },
  { id: 'production-harvest', icon: 'wheat' },
  { id: 'profit-loss', icon: 'euro' },
  { id: 'field-comparison', icon: 'bar-chart' },
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
  {
    fieldId: 'field3',
    fieldName: 'East Hill Plantation',
    location: 'Messenia, Greece',
    areaHa: 15.7,
    treeCount: 520,
    treeAge: 20,
    variety: 'Picual',
    productionType: 'Both',
    irrigationType: 'Drip',
    soilType: 'Loam',
    lastPruningDate: '2024-11-10',
    lastSoilAnalysis: '2025-01-20',
    lastHarvestDate: '2025-10-15',
    tasksCompleted: 52,
    tasksPending: 12,
    tasksOverdue: 6,
    totalProductionKg: 3900,
    yieldPerTree: 7.5,
    yieldPerHa: 248,
    totalCost: 4120,
    costPerHa: 262,
    revenue: 5520,
    profit: 1400,
    oilProducedKg: 620,
    oilYieldPercent: 15.9,
    issues: [
      'High pest pressure from olive moth',
      'Soil analysis overdue',
      '6 overdue pruning tasks',
      'Water usage 18% above average',
    ],
    recommendations: [
      'Priority pest management program for next season',
      'Schedule soil analysis before spring fertilization',
      'Complete overdue pruning by end of March',
      'Audit drip lines for leaks',
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
  {
    fieldId: 'field3',
    fieldName: 'East Hill Plantation',
    harvestDate: '2025-10-15',
    harvestMethod: 'Hand harvest',
    workersUsed: 18,
    oliveKg: 3900,
    kgPerTree: 7.5,
    kgPerHa: 248,
    millName: 'Peloponnese Olive Mill',
    deliveryTime: '5 hours',
    oilKg: 620,
    oilYieldPercent: 15.9,
    oilAcidity: 0.45,
    qualityGrade: 'Virgin',
    rejectedKg: 210,
    notes: 'Pest damage affected quality. Consider earlier harvest next year.',
  },
];

export const MOCK_PROFIT_LOSS: ProfitLossData = {
  season: '2025',
  income: {
    oliveOilSales: 10800,
    tableOliveSales: 1200,
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
  totalIncome: 12800,
  totalExpenses: 5450,
  netProfit: 7350,
  costPerKgOlives: 0.42,
  costPerKgOil: 2.65,
  revenuePerKgOil: 7.8,
  breakEvenPrice: 3.4,
  profitPerHa: 2940,
  profitPerTree: 8.75,
  profitByField: [
    { fieldId: 'field1', fieldName: 'North Olive Grove', profit: 5150, profitPerHa: 412 },
    { fieldId: 'field2', fieldName: 'South Valley Fields', profit: 5070, profitPerHa: 611 },
    { fieldId: 'field3', fieldName: 'East Hill Plantation', profit: 1400, profitPerHa: 89 },
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
  {
    fieldId: 'field3',
    fieldName: 'East Hill Plantation',
    oliveKg: 3900,
    oilKg: 620,
    oilYieldPercent: 15.9,
    kgPerTree: 7.5,
    kgPerHa: 248,
    costPerHa: 262,
    profitPerHa: 89,
    tasksCompleted: 52,
    issueCount: 4,
    pestPressure: 'High',
    waterUsageM3: 580,
  },
];

export const MOCK_COMPARISON_INSIGHTS: ComparisonInsights = {
  bestYieldField: 'South Valley Fields',
  bestOilYieldField: 'South Valley Fields',
  mostProfitableField: 'South Valley Fields',
  mostExpensiveField: 'East Hill Plantation',
  mostOverdueTasksField: 'East Hill Plantation',
  highestPestField: 'East Hill Plantation',
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

export function formatCurrency(value: number): string {
  return `€${value.toLocaleString('en-EU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatNumber(value: number | undefined, decimals = 0): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString('en-EU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(1)}%`;
}

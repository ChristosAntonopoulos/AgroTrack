import { ProfitLossData } from '../../services/reportTypes';

export type Reading = 'clear' | 'watch' | 'stress' | 'unknown';
export type CostGroup = 'labour' | 'inputs' | 'harvest' | 'overhead';

export interface LedgerLine {
  key: string;
  amount: number;
}

export interface GroupedCosts {
  group: CostGroup;
  amount: number;
  lines: LedgerLine[];
}

const GROUP_OF: Record<string, CostGroup> = {
  labor: 'labour',
  pruning: 'labour',
  harvest_workers: 'labour',
  collaborator_services: 'labour',
  agronomist: 'labour',
  fertilizers: 'inputs',
  treatments: 'inputs',
  plant_protection: 'inputs',
  irrigation_water: 'inputs',
  irrigation: 'inputs',
  electricity_fuel: 'inputs',
  fuel_and_energy: 'inputs',
  equipment: 'inputs',
  equipment_and_tools: 'inputs',
  repairs: 'inputs',
  mill_cost: 'harvest',
  mill: 'harvest',
  transport: 'harvest',
  packaging: 'harvest',
  storage: 'harvest',
  land_rent: 'overhead',
  other: 'overhead',
  other_expense: 'overhead',
};

export function weatherObserved(input: {
  insights: { code: string }[];
  minTemperatureC?: number;
  maxTemperatureC?: number;
  rainTotalMm: number;
  et0TotalMm?: number;
  frostNights: number;
  heatDays: number;
  heavyRainDays: number;
}): boolean {
  if (input.insights.some((item) => item.code === 'noData')) return false;
  if (input.minTemperatureC != null || input.maxTemperatureC != null) return true;
  if (input.rainTotalMm > 0 || (input.et0TotalMm ?? 0) > 0) return true;
  return input.frostNights > 0 || input.heatDays > 0 || input.heavyRainDays > 0;
}

export function readingFrost(nights: number, observed: boolean): Reading {
  if (!observed) return 'unknown';
  if (nights <= 0) return 'clear';
  if (nights <= 3) return 'watch';
  return 'stress';
}

export function readingHeat(days: number, observed: boolean): Reading {
  if (!observed) return 'unknown';
  if (days <= 5) return 'clear';
  if (days <= 15) return 'watch';
  return 'stress';
}

export function readingDry(days: number, observed: boolean): Reading {
  if (!observed) return 'unknown';
  if (days < 14) return 'clear';
  if (days <= 21) return 'watch';
  return 'stress';
}

/** Climatic balance (rain − ET₀). A surplus is not scored as stress. */
export function readingWater(mm: number | null | undefined): Reading {
  if (mm == null || Number.isNaN(mm)) return 'unknown';
  if (mm >= -50) return 'clear';
  if (mm >= -150) return 'watch';
  return 'stress';
}

/** Indicative canopy band for an olive grove. Not a diagnosis. */
export function readingNdvi(value: number | null | undefined): Reading {
  if (value == null || Number.isNaN(value)) return 'unknown';
  if (value >= 0.35) return 'clear';
  if (value >= 0.25) return 'watch';
  return 'stress';
}

/** Indicative oil-on-fruit band. Not a commercial grade. */
export function readingOilYield(pct: number | null | undefined): Reading {
  if (pct == null || Number.isNaN(pct) || pct <= 0) return 'unknown';
  if (pct >= 16) return 'clear';
  if (pct >= 12) return 'watch';
  return 'stress';
}

export function weightedMean(rows: { value: number; weight: number }[]): number | null {
  const usable = rows.filter((row) => row.weight > 0 && Number.isFinite(row.value));
  const weight = usable.reduce((sum, row) => sum + row.weight, 0);
  if (weight <= 0) return null;
  return usable.reduce((sum, row) => sum + row.value * row.weight, 0) / weight;
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

function positiveEntries(raw?: Record<string, number>): LedgerLine[] {
  if (!raw) return [];
  return Object.entries(raw)
    .map(([key, amount]) => ({ key, amount: Number(amount) || 0 }))
    .filter((line) => line.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function incomeLines(pl: ProfitLossData): LedgerLine[] {
  const classified = positiveEntries(pl.incomeByCategory);
  if (classified.length > 0) return classified;

  const structured = [
    { key: 'olive_oil_sale', amount: pl.income.oliveOilSales },
    { key: 'table_olive_sale', amount: pl.income.tableOliveSales },
    { key: 'bulk_olive_sale', amount: pl.income.bulkOliveSales },
    { key: 'subsidy', amount: pl.income.subsidies },
    { key: 'other_income', amount: pl.income.other },
  ].filter((line) => line.amount > 0);

  if (structured.length > 1) return structured.sort((a, b) => b.amount - a.amount);
  if (structured.length === 1 && structured[0].key !== 'olive_oil_sale') return structured;
  if (pl.totalIncome > 0) return [{ key: 'recorded', amount: pl.totalIncome }];
  return [];
}

export function expenseGroups(pl: ProfitLossData): GroupedCosts[] {
  const classified = positiveEntries(pl.expensesByCategory);
  const lines = classified.length > 0
    ? classified
    : positiveEntries({
        labor: pl.expenses.labor,
        fertilizers: pl.expenses.fertilizers,
        treatments: pl.expenses.treatments,
        irrigation_water: pl.expenses.irrigationWater,
        electricity_fuel: pl.expenses.electricityFuel,
        equipment: pl.expenses.equipment,
        repairs: pl.expenses.repairs,
        pruning: pl.expenses.pruning,
        harvest_workers: pl.expenses.harvestWorkers,
        mill: pl.expenses.millCost,
        transport: pl.expenses.transport,
        packaging: pl.expenses.packaging,
        storage: pl.expenses.storage,
        agronomist: pl.expenses.agronomist,
        other_expense: pl.expenses.other,
      });

  const order: CostGroup[] = ['labour', 'inputs', 'harvest', 'overhead'];
  return order
    .map((group) => {
      const groupLines = lines.filter((line) => (GROUP_OF[line.key] ?? 'overhead') === group);
      return {
        group,
        amount: sum(groupLines.map((line) => line.amount)),
        lines: groupLines,
      };
    })
    .filter((group) => group.amount > 0);
}

export function marginPercent(profit: number, revenue: number): number | null {
  if (revenue <= 0) return null;
  return (profit / revenue) * 100;
}

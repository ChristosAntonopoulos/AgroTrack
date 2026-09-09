import type { HarvestRecord } from '../services/harvestService';
import type { FinancialEntry } from '../services/financialEntryService';
import { friendlyFieldLabel } from './fieldLabels';

export type FinancialEntryKind = 'expense' | 'income';

export type EconomicsGroupId =
  | 'workers'
  | 'mill'
  | 'fuel'
  | 'plantProtection'
  | 'fertilization'
  | 'irrigation'
  | 'pruning'
  | 'machinery'
  | 'transport'
  | 'harvest'
  | 'other'
  | 'sale'
  | 'fruitSale'
  | 'oilSale'
  | 'subsidy'
  | 'otherIncome';

const EXPENSE_CATEGORY_TO_GROUP: Record<string, EconomicsGroupId> = {
  labor: 'workers',
  harvest_workers: 'harvest',
  mill_cost: 'mill',
  electricity_fuel: 'fuel',
  treatments: 'plantProtection',
  fertilizers: 'fertilization',
  irrigation_water: 'irrigation',
  pruning: 'pruning',
  equipment: 'machinery',
  repairs: 'machinery',
  transport: 'transport',
  packaging: 'harvest',
  storage: 'harvest',
  agronomist: 'other',
  other: 'other',
};

const INCOME_CATEGORY_TO_GROUP: Record<string, EconomicsGroupId> = {
  fruit_sale: 'fruitSale',
  oil_sale: 'oilSale',
  subsidy: 'subsidy',
  other: 'otherIncome',
};

export const entryYear = (entry: FinancialEntry): number => new Date(entry.occurredOn).getFullYear();

export const isPosted = (entry: FinancialEntry): boolean => entry.status === 'posted';

export const economicsGroupFor = (entry: FinancialEntry): EconomicsGroupId => {
  const category = (entry.category || '').trim();
  if (entry.kind === 'income') {
    if (category && INCOME_CATEGORY_TO_GROUP[category]) return INCOME_CATEGORY_TO_GROUP[category];
    return 'sale';
  }
  if (category && EXPENSE_CATEGORY_TO_GROUP[category]) return EXPENSE_CATEGORY_TO_GROUP[category];
  if (entry.bucket === 'labor') return 'workers';
  if (entry.bucket === 'harvest') return 'harvest';
  if (entry.bucket === 'inputs') return 'plantProtection';
  return 'other';
};

export const filterByYear = (entries: FinancialEntry[], year: number): FinancialEntry[] =>
  entries.filter((entry) => isPosted(entry) && entryYear(entry) === year);

export const filterByField = (entries: FinancialEntry[], fieldId?: string): FinancialEntry[] =>
  fieldId ? entries.filter((entry) => entry.fieldId === fieldId) : entries;

export type EconomicsTotals = {
  income: number;
  expenses: number;
  result: number;
  hasIncome: boolean;
  hasExpenses: boolean;
  count: number;
  currency: string;
};

export const summarizeEntries = (entries: FinancialEntry[]): EconomicsTotals => {
  const posted = entries.filter(isPosted);
  let income = 0;
  let expenses = 0;
  let hasIncome = false;
  let hasExpenses = false;
  for (const entry of posted) {
    if (entry.kind === 'income') {
      income += entry.amount;
      hasIncome = true;
    } else {
      expenses += entry.amount;
      hasExpenses = true;
    }
  }
  return {
    income,
    expenses,
    result: income - expenses,
    hasIncome,
    hasExpenses,
    count: posted.length,
    currency: posted[0]?.currency || 'EUR',
  };
};

export type CategorySpend = {
  group: EconomicsGroupId;
  amount: number;
};

export const expenseBreakdown = (entries: FinancialEntry[]): CategorySpend[] => {
  const map = new Map<EconomicsGroupId, number>();
  for (const entry of entries.filter((e) => isPosted(e) && e.kind === 'expense')) {
    const group = economicsGroupFor(entry);
    map.set(group, (map.get(group) || 0) + entry.amount);
  }
  return [...map.entries()]
    .map(([group, amount]) => ({ group, amount }))
    .sort((a, b) => b.amount - a.amount);
};

export type FieldMoneyRow = {
  fieldId: string;
  label: string;
  income: number;
  expenses: number;
  result: number;
  hasIncome: boolean;
  hasExpenses: boolean;
  currency: string;
};

export const perFieldRows = (
  entries: FinancialEntry[],
  fields: Array<{ id: string; name?: string | null }>
): FieldMoneyRow[] =>
  fields
    .map((field) => {
      const scoped = entries.filter((e) => e.fieldId === field.id && isPosted(e));
      const totals = summarizeEntries(scoped);
      return {
        fieldId: field.id,
        label: friendlyFieldLabel(field.name),
        income: totals.income,
        expenses: totals.expenses,
        result: totals.result,
        hasIncome: totals.hasIncome,
        hasExpenses: totals.hasExpenses,
        currency: totals.currency,
      };
    })
    .filter((row) => row.hasIncome || row.hasExpenses)
    .sort((a, b) => b.result - a.result || b.expenses - a.expenses);

export type MonthPoint = {
  month: number;
  income: number;
  expenses: number;
  hasIncome: boolean;
  hasExpenses: boolean;
};

export const monthlySeries = (entries: FinancialEntry[], year: number): MonthPoint[] => {
  const posted = filterByYear(entries, year);
  if (posted.length === 0) return [];
  const months = posted.map((e) => new Date(e.occurredOn).getMonth() + 1);
  const first = Math.min(...months);
  const last = Math.max(...months);
  const points: MonthPoint[] = [];
  for (let month = first; month <= last; month += 1) {
    const inMonth = posted.filter((e) => new Date(e.occurredOn).getMonth() + 1 === month);
    const incomeEntries = inMonth.filter((e) => e.kind === 'income');
    const expenseEntries = inMonth.filter((e) => e.kind === 'expense');
    points.push({
      month,
      income: incomeEntries.reduce((sum, e) => sum + e.amount, 0),
      expenses: expenseEntries.reduce((sum, e) => sum + e.amount, 0),
      hasIncome: incomeEntries.length > 0,
      hasExpenses: expenseEntries.length > 0,
    });
  }
  return points;
};

export const yearsFromEntries = (entries: FinancialEntry[], now = new Date()): number[] => {
  const years = new Set<number>([now.getFullYear()]);
  for (const entry of entries) {
    if (isPosted(entry)) years.add(entryYear(entry));
  }
  return [...years].sort((a, b) => b - a);
};

export type DayGroup = {
  key: string;
  date: Date;
  entries: FinancialEntry[];
};

export type MonthGroup = {
  key: string;
  year: number;
  month: number;
  days: DayGroup[];
};

export const groupMovements = (entries: FinancialEntry[]): MonthGroup[] => {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime()
  );
  const months: MonthGroup[] = [];
  for (const entry of sorted) {
    const date = new Date(entry.occurredOn);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const dayKey = `${monthKey}-${String(date.getDate()).padStart(2, '0')}`;
    let month = months.find((m) => m.key === monthKey);
    if (!month) {
      month = { key: monthKey, year: date.getFullYear(), month: date.getMonth() + 1, days: [] };
      months.push(month);
    }
    let day = month.days.find((d) => d.key === dayKey);
    if (!day) {
      day = { key: dayKey, date, entries: [] };
      month.days.push(day);
    }
    day.entries.push(entry);
  }
  return months;
};

export const formatEconomicsMoney = (amount: number, currency: string, locale: string): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency || 'EUR'}`;
  }
};

export const formatSignedEconomics = (
  amount: number,
  currency: string,
  locale: string,
  kind?: FinancialEntryKind
): string => {
  const formatted = formatEconomicsMoney(Math.abs(amount), currency, locale);
  if (kind === 'income' || (kind == null && amount > 0)) return `+${formatted}`;
  if (kind === 'expense' || (kind == null && amount < 0)) return `−${formatted}`;
  return formatted;
};

export const harvestKgInYear = (
  harvests: HarvestRecord[],
  fieldIds: string[],
  year: number
): number => {
  const scoped = new Set(fieldIds);
  return harvests
    .filter((h) => h.status !== 'voided')
    .filter((h) => scoped.has(h.fieldId))
    .filter((h) => new Date(h.harvestDate).getFullYear() === year)
    .reduce((sum, h) => sum + (h.oliveKg || 0), 0);
};

export const matchesSearch = (
  entry: FinancialEntry,
  query: string,
  fieldLabel: string,
  categoryLabel: string
): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [entry.description, entry.notes, fieldLabel, categoryLabel, entry.category]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
};

import type { ChronologioEntry } from '../services/chronologioService';
import type { FinancialEntry } from '../services/financialEntryService';
import type { HarvestRecord } from '../services/harvestService';
import { HARVEST_COST_CATEGORIES } from './categoryNormalize';
import { isPosted } from './economics';

export type GroveTotals = {
  recordedExpenses: number;
  recordedIncome: number;
  recordedResult: number;
  estimatedTaskCosts: number;
  oliveKg: number;
  oilKg: number;
  oilYieldPercent: number | null;
  costPerKgOlives: number | null;
  harvestCostPerKg: number | null;
  harvestCount: number;
  completedTasks: number;
  currency: string;
  hasExpenses: boolean;
  hasIncome: boolean;
};

const finite = (n: number | null | undefined): n is number =>
  typeof n === 'number' && Number.isFinite(n);

export const oilYieldPercent = (oliveKg: number, oilKg: number): number | null => {
  if (!(oliveKg > 0) || !(oilKg >= 0) || !Number.isFinite(oliveKg) || !Number.isFinite(oilKg)) {
    return null;
  }
  return (oilKg / oliveKg) * 100;
};

export const ratioOrNull = (numerator: number, denominator: number): number | null => {
  if (!(denominator > 0) || !Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return null;
  }
  return numerator / denominator;
};

const taskLinkedExpenseIds = (entries: FinancialEntry[]): Set<string> => {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (isPosted(entry) && entry.kind === 'expense' && entry.taskId) ids.add(entry.taskId);
  }
  return ids;
};

export const summarizeLedger = (entries: FinancialEntry[]): GroveTotals => {
  let recordedExpenses = 0;
  let recordedIncome = 0;
  let harvestSpend = 0;
  let hasExpenses = false;
  let hasIncome = false;
  let currency = 'EUR';
  for (const entry of entries.filter(isPosted)) {
    currency = entry.currency || currency;
    if (entry.kind === 'income') {
      recordedIncome += entry.amount;
      hasIncome = true;
    } else {
      recordedExpenses += entry.amount;
      hasExpenses = true;
      if (HARVEST_COST_CATEGORIES.has(entry.category) || entry.harvestId || entry.bucket === 'harvest') {
        harvestSpend += entry.amount;
      }
    }
  }
  return {
    recordedExpenses,
    recordedIncome,
    recordedResult: recordedIncome - recordedExpenses,
    estimatedTaskCosts: 0,
    oliveKg: 0,
    oilKg: 0,
    oilYieldPercent: null,
    costPerKgOlives: null,
    harvestCostPerKg: null,
    harvestCount: 0,
    completedTasks: 0,
    currency,
    hasExpenses,
    hasIncome,
  };
};

export const summarizeHarvests = (harvests: HarvestRecord[]): Pick<GroveTotals, 'oliveKg' | 'oilKg' | 'oilYieldPercent' | 'harvestCount'> => {
  let oliveKg = 0;
  let oilKg = 0;
  let harvestCount = 0;
  for (const h of harvests) {
    if (h.status === 'voided') continue;
    harvestCount += 1;
    oliveKg += h.oliveKg || 0;
    oilKg += h.oilKg || 0;
  }
  return {
    oliveKg,
    oilKg,
    oilYieldPercent: oilYieldPercent(oliveKg, oilKg),
    harvestCount,
  };
};

/**
 * Chronologio totals: recorded ledger expenses only.
 * Task amounts that already have a matching expense entry are ignored.
 */
export const summarizeChronologioEntries = (entries: ChronologioEntry[]): GroveTotals & {
  notesCount: number;
} => {
  let recordedExpenses = 0;
  let recordedIncome = 0;
  let estimatedTaskCosts = 0;
  let oliveKg = 0;
  let oilKg = 0;
  let notesCount = 0;
  let completedTasks = 0;
  let harvestCount = 0;
  let harvestSpend = 0;
  let currency = 'EUR';
  const expenseTaskIds = new Set<string>();

  for (const entry of entries) {
    if (entry.category === 'expense' && entry.amount) {
      recordedExpenses += entry.amount.value;
      currency = entry.amount.currency || currency;
      const linked = entry.details.expense?.linkedTaskId;
      if (linked) expenseTaskIds.add(linked);
      const cat = (entry.details.expense?.expenseCategory || '').toLowerCase();
      if (HARVEST_COST_CATEGORIES.has(cat)) {
        harvestSpend += entry.amount.value;
      }
    }
    if (entry.category === 'task') {
      const status = entry.details.task?.status;
      if (!status || status.toLowerCase() === 'completed') completedTasks += 1;
    }
  }

  for (const entry of entries) {
    if (entry.category === 'task' && entry.amount) {
      const taskId = entry.details.task?.taskId || entry.sourceId;
      if (!expenseTaskIds.has(taskId)) estimatedTaskCosts += entry.amount.value;
    }
    if (entry.category === 'harvest' && entry.details.harvest) {
      harvestCount += 1;
      oliveKg += entry.details.harvest.oliveKg ?? 0;
      oilKg += entry.details.harvest.oilKg ?? 0;
    }
    if (entry.category === 'note') notesCount += 1;
  }

  return {
    recordedExpenses,
    recordedIncome,
    recordedResult: recordedIncome - recordedExpenses,
    estimatedTaskCosts,
    oliveKg,
    oilKg,
    oilYieldPercent: oilYieldPercent(oliveKg, oilKg),
    costPerKgOlives: ratioOrNull(recordedExpenses, oliveKg),
    harvestCostPerKg: ratioOrNull(harvestSpend, oliveKg),
    harvestCount,
    completedTasks,
    currency,
    hasExpenses: recordedExpenses > 0,
    hasIncome: recordedIncome > 0,
    notesCount,
  };
};

export const withProductionCosts = (
  totals: GroveTotals,
  oliveKg: number,
  harvestSpend: number
): GroveTotals => ({
  ...totals,
  oliveKg,
  costPerKgOlives: ratioOrNull(totals.recordedExpenses, oliveKg),
  harvestCostPerKg: ratioOrNull(harvestSpend, oliveKg),
});

export { taskLinkedExpenseIds };

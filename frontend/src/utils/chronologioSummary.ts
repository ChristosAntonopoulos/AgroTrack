export type ChronologioSummaryStats = {
  expenseTotal: number;
  currency: string;
  oliveKg: number;
  oilKg: number;
  notesCount: number;
  completedTasks: number;
  harvestCount: number;
};

export const summarizeChronologioEntries = (
  entries: import('../services/chronologioService').ChronologioEntry[]
): ChronologioSummaryStats => {
  let expenseTotal = 0;
  let currency = 'EUR';
  let oliveKg = 0;
  let oilKg = 0;
  let notesCount = 0;
  let completedTasks = 0;
  let harvestCount = 0;

  for (const entry of entries) {
    if (entry.category === 'expense' && entry.amount) {
      expenseTotal += entry.amount.value;
      currency = entry.amount.currency || currency;
    }
    if (entry.category === 'task') {
      completedTasks += 1;
      if (entry.amount) {
        expenseTotal += entry.amount.value;
        currency = entry.amount.currency || currency;
      }
    }
    if (entry.category === 'harvest' && entry.details.harvest) {
      harvestCount += 1;
      oliveKg += entry.details.harvest.oliveKg ?? 0;
      oilKg += entry.details.harvest.oilKg ?? 0;
    }
    if (entry.category === 'note') {
      notesCount += 1;
    }
  }

  return {
    expenseTotal,
    currency,
    oliveKg,
    oilKg,
    notesCount,
    completedTasks,
    harvestCount,
  };
};

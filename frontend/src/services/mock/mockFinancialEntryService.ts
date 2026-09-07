import {
  CreateFinancialEntryInput,
  FieldFinancialSummary,
  FinancialEntry,
  FinancialOverview,
  financialEntryService,
} from '../financialEntryService';

const STORAGE_KEY = 'agrotrack_demo_financial_entries_v1';

const readEntries = (): FinancialEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FinancialEntry[]) : [];
  } catch {
    return [];
  }
};

const writeEntries = (entries: FinancialEntry[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

const buildSummary = (fieldId: string, entries: FinancialEntry[], lifecycleYear?: string): FieldFinancialSummary => {
  const posted = entries.filter((e) => e.status === 'posted');
  const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const expenses = posted.filter((e) => e.kind === 'expense');
  const income = posted.filter((e) => e.kind === 'income');
  const expensesByBucket: Record<string, number> = {};
  for (const e of expenses) {
    const key = e.bucket || 'other';
    expensesByBucket[key] = (expensesByBucket[key] || 0) + e.amount;
  }

  return {
    fieldId,
    currency: posted[0]?.currency || 'EUR',
    lifecycleYear,
    totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
    totalIncome: income.reduce((sum, e) => sum + e.amount, 0),
    net: income.reduce((sum, e) => sum + e.amount, 0) - expenses.reduce((sum, e) => sum + e.amount, 0),
    postedCount: posted.length,
    thisWeekExpenses: expenses
      .filter((e) => new Date(e.occurredOn).getTime() >= weekStart)
      .reduce((sum, e) => sum + e.amount, 0),
    expensesByBucket,
  };
};

export const mockFinancialEntryService: typeof financialEntryService = {
  listByField: async (fieldId, includeVoided = false) => {
    const entries = readEntries()
      .filter((e) => e.fieldId === fieldId)
      .filter((e) => includeVoided || e.status !== 'voided')
      .sort((a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime());
    return entries;
  },

  getOverview: async (): Promise<FinancialOverview> => {
    const entries = readEntries().filter((e) => e.status === 'posted');
    const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const expenses = entries.filter((e) => e.kind === 'expense');
    const income = entries.filter((e) => e.kind === 'income');
    return {
      currency: 'EUR',
      thisWeekExpenses: expenses
        .filter((e) => new Date(e.occurredOn).getTime() >= weekStart)
        .reduce((sum, e) => sum + e.amount, 0),
      totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
      totalIncome: income.reduce((sum, e) => sum + e.amount, 0),
      net: income.reduce((sum, e) => sum + e.amount, 0) - expenses.reduce((sum, e) => sum + e.amount, 0),
      postedCount: entries.length,
      fieldCount: new Set(entries.map((e) => e.fieldId)).size,
      topFields: [],
    };
  },

  getSummary: async (fieldId, lifecycleYear) => {
    const entries = readEntries()
      .filter((e) => e.fieldId === fieldId)
      .filter((e) => !lifecycleYear || e.lifecycleYear === lifecycleYear);
    return buildSummary(fieldId, entries, lifecycleYear);
  },

  create: async (input: CreateFinancialEntryInput) => {
    const now = new Date().toISOString();
    const amount =
      input.quantity != null && input.unitPrice != null
        ? Math.round(input.quantity * input.unitPrice * 100) / 100
        : Number(input.amount);
    const entry: FinancialEntry = {
      id: `fin-${Date.now()}`,
      fieldId: input.fieldId,
      lifecycleYear: input.lifecycleYear || 'low',
      taskId: input.taskId,
      kind: input.kind || 'expense',
      amount,
      currency: (input.currency || 'EUR').toUpperCase(),
      description: input.description.trim(),
      bucket: input.bucket,
      category: input.category,
      quantity: input.quantity,
      unit: input.unit,
      unitPrice: input.unitPrice,
      occurredOn: input.occurredOn || now,
      status: 'posted',
      recordedBy: 'demo-user',
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };
    writeEntries([entry, ...readEntries()]);
    return entry;
  },

  void: async (id, reason) => {
    const entries = readEntries();
    const index = entries.findIndex((e) => e.id === id);
    if (index < 0) {
      throw new Error('Financial entry not found');
    }
    const now = new Date().toISOString();
    entries[index] = {
      ...entries[index],
      status: 'voided',
      voidReason: reason,
      voidedAt: now,
      voidedBy: 'demo-user',
      updatedAt: now,
    };
    writeEntries(entries);
    return entries[index];
  },
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CreateFinancialEntryInput,
  FieldFinancialSummary,
  FinancialEntry,
  financialEntryService,
} from './financialEntryService';

const STORAGE_KEY = 'agrotrack_demo_financial_entries_v1';

const readEntries = async (): Promise<FinancialEntry[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FinancialEntry[]) : [];
  } catch {
    return [];
  }
};

const writeEntries = async (entries: FinancialEntry[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export const mockFinancialEntryService: typeof financialEntryService = {
  listByField: async (fieldId) => {
    const entries = await readEntries();
    return entries
      .filter((e) => e.fieldId === fieldId && e.status === 'posted')
      .sort((a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime());
  },

  getSummary: async (fieldId, lifecycleYear) => {
    const entries = (await readEntries()).filter(
      (e) =>
        e.fieldId === fieldId &&
        e.status === 'posted' &&
        (!lifecycleYear || e.lifecycleYear === lifecycleYear)
    );
    const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const expenses = entries.filter((e) => e.kind === 'expense');
    const income = entries.filter((e) => e.kind === 'income');
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = income.reduce((sum, e) => sum + e.amount, 0);
    return {
      fieldId,
      currency: entries[0]?.currency || 'EUR',
      totalExpenses,
      totalIncome,
      net: totalIncome - totalExpenses,
      thisWeekExpenses: expenses
        .filter((e) => new Date(e.occurredOn).getTime() >= weekStart)
        .reduce((sum, e) => sum + e.amount, 0),
      postedCount: entries.length,
    };
  },

  create: async (input: CreateFinancialEntryInput) => {
    const now = new Date().toISOString();
    const entry: FinancialEntry = {
      id: `fin-${Date.now()}`,
      fieldId: input.fieldId,
      lifecycleYear: input.lifecycleYear || 'low',
      kind: input.kind === 'income' ? 'income' : 'expense',
      amount: input.amount,
      currency: input.currency || 'EUR',
      description: input.description.trim(),
      bucket: input.bucket,
      occurredOn: input.occurredOn || now,
      status: 'posted',
    };
    const existing = await readEntries();
    await writeEntries([entry, ...existing]);
    return entry;
  },

  void: async (id, reason) => {
    const entries = await readEntries();
    const index = entries.findIndex((e) => e.id === id);
    if (index < 0) {
      throw new Error('Financial entry not found.');
    }
    const updated: FinancialEntry = {
      ...entries[index],
      status: 'voided',
    };
    void reason;
    entries[index] = updated;
    await writeEntries(entries);
    return updated;
  },
};

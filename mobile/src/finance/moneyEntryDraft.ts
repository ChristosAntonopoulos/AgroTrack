import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FinancialCategory, FinancialTransactionType } from './display';
import type { MoneyRepeat, MoneySplitMode } from './moneySeries';
import type { FinancialCalculationMode, FinancialQuantityUnit } from './quantityCalculator';

export const MONEY_ENTRY_DRAFT_KEY = 'Oleachron.money.entryDraft.v1';

export type MoneyEntryDraftSnapshot = {
  kind: FinancialTransactionType;
  category: FinancialCategory;
  mode: FinancialCalculationMode;
  quantity: string;
  unit: FinancialQuantityUnit;
  unitPrice: string;
  amount: string;
  fieldId: string;
  occurredOn: string;
  description: string;
  relatedTaskId: string;
  relatedHarvestId: string;
  paymentMethod: string;
  counterpartyName: string;
  notes: string;
  resultYear: number;
  moreOpen: boolean;
  splitMode?: MoneySplitMode;
  splitFieldIds?: string[];
  repeat?: MoneyRepeat;
  savedAt: string;
};

export async function writeMoneyEntryDraft(
  snapshot: Omit<MoneyEntryDraftSnapshot, 'savedAt'>
): Promise<void> {
  try {
    const payload: MoneyEntryDraftSnapshot = { ...snapshot, savedAt: new Date().toISOString() };
    await AsyncStorage.setItem(MONEY_ENTRY_DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota failures.
  }
}

export async function readMoneyEntryDraft(): Promise<MoneyEntryDraftSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(MONEY_ENTRY_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MoneyEntryDraftSnapshot;
    if (!parsed || typeof parsed !== 'object' || !parsed.kind) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearMoneyEntryDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MONEY_ENTRY_DRAFT_KEY);
  } catch {
    // ignore
  }
}

/** True when the user has typed something beyond an empty shell. */
export function isMoneyEntryPartial(input: {
  amount: string;
  quantity: string;
  unitPrice: string;
  description: string;
  relatedTaskId: string;
  relatedHarvestId: string;
  paymentMethod: string;
  counterpartyName: string;
  notes: string;
}): boolean {
  return Boolean(
    input.amount.trim() ||
      input.quantity.trim() ||
      input.unitPrice.trim() ||
      input.description.trim() ||
      input.relatedTaskId ||
      input.relatedHarvestId ||
      input.paymentMethod ||
      input.counterpartyName.trim() ||
      input.notes.trim()
  );
}

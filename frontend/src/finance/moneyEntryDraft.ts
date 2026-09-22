import type { FinancialCategory, FinancialTransactionType } from './display';
import type { FinancialCalculationMode, FinancialQuantityUnit } from './quantityCalculator';

export const MONEY_ENTRY_DRAFT_KEY = 'agrotrack.money.entryDraft.v1';

export type MoneyEntryStep = 'kind' | 'category' | 'oil' | 'pack' | 'amount' | 'field' | 'when';

export type MoneyEntryDraftSnapshot = {
  kind: FinancialTransactionType;
  step?: MoneyEntryStep;
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
  savedAt: string;
};

export function writeMoneyEntryDraft(snapshot: Omit<MoneyEntryDraftSnapshot, 'savedAt'>): void {
  try {
    const payload: MoneyEntryDraftSnapshot = { ...snapshot, savedAt: new Date().toISOString() };
    sessionStorage.setItem(MONEY_ENTRY_DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function readMoneyEntryDraft(): MoneyEntryDraftSnapshot | null {
  try {
    const raw = sessionStorage.getItem(MONEY_ENTRY_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MoneyEntryDraftSnapshot;
    if (!parsed || typeof parsed !== 'object' || !parsed.kind) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearMoneyEntryDraft(): void {
  try {
    sessionStorage.removeItem(MONEY_ENTRY_DRAFT_KEY);
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

import {
  clearMoneyEntryDraft,
  isMoneyEntryPartial,
  readMoneyEntryDraft,
  writeMoneyEntryDraft,
} from './moneyEntryDraft';

describe('moneyEntryDraft', () => {
  beforeEach(() => {
    clearMoneyEntryDraft();
  });

  it('detects a partial entry when the user typed something', () => {
    expect(
      isMoneyEntryPartial({
        amount: '',
        quantity: '',
        unitPrice: '',
        description: '',
        relatedTaskId: '',
        relatedHarvestId: '',
        paymentMethod: '',
        counterpartyName: '',
        notes: '',
      })
    ).toBe(false);
    expect(
      isMoneyEntryPartial({
        amount: '12',
        quantity: '',
        unitPrice: '',
        description: '',
        relatedTaskId: '',
        relatedHarvestId: '',
        paymentMethod: '',
        counterpartyName: '',
        notes: '',
      })
    ).toBe(true);
  });

  it('round-trips a draft in sessionStorage', () => {
    writeMoneyEntryDraft({
      kind: 'expense',
      category: 'labor',
      mode: 'total_only',
      quantity: '',
      unit: 'workday',
      unitPrice: '',
      amount: '45',
      fieldId: 'field-1',
      occurredOn: '2026-03-10',
      description: 'Εργάτες',
      relatedTaskId: '',
      relatedHarvestId: '',
      paymentMethod: '',
      counterpartyName: '',
      notes: '',
      resultYear: 2026,
      moreOpen: false,
    });
    expect(readMoneyEntryDraft()?.amount).toBe('45');
    clearMoneyEntryDraft();
    expect(readMoneyEntryDraft()).toBeNull();
  });
});

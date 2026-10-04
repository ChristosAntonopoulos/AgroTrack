import { isMoneyEntryPartial } from './moneyEntryDraft';

describe('moneyEntryDraft', () => {
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
});

import { harvestExpenseCaptureContext } from './harvestMoneyCapture';
import { emptyCampaign } from './types';

describe('harvestExpenseCaptureContext', () => {
  it('opens the same expense form as grove money, with harvest fields filled', () => {
    const campaign = { ...emptyCampaign(2026), fieldOrder: ['grove-1'] };
    const ctx = harvestExpenseCaptureContext({
      campaign,
      fieldId: 'grove-1',
      today: '2026-11-12',
      description: 'Έξοδο συγκομιδής',
    });
    expect(ctx.preferredType).toBe('expense');
    expect(ctx.harvestCampaignLink).toBe(true);
    expect(ctx.fieldId).toBe('grove-1');
  });

  it('does not default to the first grove when several participate', () => {
    const campaign = { ...emptyCampaign(2026), fieldOrder: ['a', 'b'] };
    expect(
      harvestExpenseCaptureContext({
        campaign,
        today: '2026-11-12',
        description: 'Έξοδο συγκομιδής',
      }).fieldId
    ).toBeUndefined();
  });
});

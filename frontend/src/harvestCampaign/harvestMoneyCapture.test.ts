import { emptyCampaign } from './types';
import { addMillWeight, addSack } from './storage';
import { harvestExpenseCaptureContext, harvestNoteCaptureContext, shouldMirrorHarvestExpense, shouldMirrorHarvestNote } from './harvestMoneyCapture';

describe('harvest money capture', () => {
  it('opens the money expense form prefilled from the live harvest', () => {
    let campaign = emptyCampaign(2026);
    campaign = { ...campaign, fieldOrder: ['north'] };
    campaign = addSack(campaign, {
      id: 's1',
      date: '2026-11-12',
      fieldId: 'north',
      sacks: 10,
      harvestRecordId: 'hr-sack',
      createdAt: '2026-11-12T08:00:00.000Z',
    });
    campaign = addMillWeight(campaign, {
      id: 'm1',
      date: '2026-11-12',
      kg: 420,
      fieldIds: ['north'],
      sackIds: ['s1'],
      harvestRecordId: 'hr-mill',
      createdAt: '2026-11-12T18:00:00.000Z',
    });

    expect(
      harvestExpenseCaptureContext({
        campaign,
        today: '2026-11-12',
        description: 'Έξοδο συγκομιδής',
      })
    ).toEqual({
      preferredType: 'expense',
      fieldId: 'north',
      occurredAt: '2026-11-12T12:00:00',
      harvestId: 'hr-mill',
      category: 'other_expense',
      description: 'Έξοδο συγκομιδής',
      harvestCampaignLink: true,
    });
  });

  it('mirrors only harvest-linked expenses with a posted amount', () => {
    expect(
      shouldMirrorHarvestExpense({
        type: 'expense',
        fieldId: 'north',
        sourceId: 'tx-1',
        amount: 80,
        harvestCampaignLink: true,
      })
    ).toBe(true);
    expect(
      shouldMirrorHarvestExpense({
        type: 'expense',
        fieldId: 'north',
        sourceId: 'tx-1',
        amount: 80,
      })
    ).toBe(false);
    expect(
      shouldMirrorHarvestExpense({
        type: 'income',
        fieldId: 'north',
        sourceId: 'tx-1',
        amount: 80,
        harvestCampaignLink: true,
      })
    ).toBe(false);
  });

  it('opens observation capture for a harvest note with session context', () => {
    let campaign = emptyCampaign(2026);
    campaign = { ...campaign, fieldOrder: ['north'] };
    expect(
      harvestNoteCaptureContext({
        campaign,
        today: '2026-11-12',
      })
    ).toEqual({
      preferredType: 'observation',
      fieldId: 'north',
      occurredAt: '2026-11-12T12:00:00',
      harvestCampaignLink: true,
    });
  });

  it('mirrors only harvest-linked observations', () => {
    expect(
      shouldMirrorHarvestNote({
        type: 'observation',
        fieldId: 'north',
        sourceId: 'note-1',
        harvestCampaignLink: true,
      })
    ).toBe(true);
    expect(
      shouldMirrorHarvestNote({
        type: 'observation',
        fieldId: 'north',
        sourceId: 'note-1',
      })
    ).toBe(false);
  });

  it('prefills expense harvestId from the latest mill record', () => {
    let campaign = emptyCampaign(2026);
    campaign = { ...campaign, fieldOrder: ['north', 'south'] };
    campaign = addMillWeight(campaign, {
      id: 'm1',
      date: '2026-11-12',
      kg: 100,
      fieldIds: ['north'],
      sackIds: [],
      harvestRecordId: 'hr-latest',
      createdAt: '2026-11-12T18:00:00.000Z',
    });
    const ctx = harvestExpenseCaptureContext({
      campaign,
      fieldId: 'south',
      today: '2026-11-13',
      description: 'Harvest expenses',
    });
    expect(ctx.fieldId).toBe('south');
    expect(ctx.harvestId).toBe('hr-latest');
    expect(ctx.occurredAt).toBe('2026-11-13T12:00:00');
    expect(ctx.harvestCampaignLink).toBe(true);
  });
});

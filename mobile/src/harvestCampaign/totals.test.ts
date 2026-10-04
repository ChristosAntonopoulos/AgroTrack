import { emptyCampaign } from './types';
import { addMillWeight, addOil, addSack, startCampaign } from './storage';
import { campaignTotals, daySummary, fieldSummaries, harvestDayNumber } from './totals';

describe('harvest day number', () => {
  it('counts calendar days from the start', () => {
    const campaign = startCampaign(
      emptyCampaign(2026),
      { fieldOrder: ['f1'] },
      new Date('2026-11-10T08:00:00+02:00')
    );
    expect(harvestDayNumber(campaign, '2026-11-15')).toBe(6);
  });
});

describe('oil yield', () => {
  it('uses official kilograms only', () => {
    let campaign = startCampaign(emptyCampaign(2026), { fieldOrder: ['f1'] });
    campaign = addSack(campaign, {
      id: 's1',
      date: '2026-11-12',
      fieldId: 'f1',
      sacks: 20,
      kgPerSack: 45,
      createdAt: '2026-11-12T10:00:00Z',
    });
    campaign = addMillWeight(campaign, {
      id: 'm1',
      date: '2026-11-12',
      kg: 860,
      fieldIds: ['f1'],
      sackIds: ['s1'],
      createdAt: '2026-11-12T18:00:00Z',
    });
    campaign = addOil(campaign, {
      id: 'o1',
      date: '2026-11-12',
      amount: 148,
      unit: 'kg',
      millWeightIds: ['m1'],
      fieldIds: ['f1'],
      createdAt: '2026-11-12T19:00:00Z',
    });
    const totals = campaignTotals(campaign);
    expect(totals.extractionYield).toBeCloseTo(17.209, 2);
    expect(daySummary(campaign, '2026-11-12').oilKg).toBe(148);
  });
});

describe('sack-weighted multi-field allocation', () => {
  it('splits mill and oil by linked sack counts without double-counting', () => {
    let campaign = startCampaign(emptyCampaign(2026), { fieldOrder: ['f1', 'f2'] });
    campaign = addSack(campaign, {
      id: 's1',
      date: '2026-11-12',
      fieldId: 'f1',
      sacks: 20,
      kgPerSack: 45,
      createdAt: '2026-11-12T10:00:00Z',
    });
    campaign = addSack(campaign, {
      id: 's2',
      date: '2026-11-12',
      fieldId: 'f2',
      sacks: 10,
      kgPerSack: 45,
      createdAt: '2026-11-12T11:00:00Z',
    });
    campaign = addMillWeight(campaign, {
      id: 'm1',
      date: '2026-11-12',
      kg: 420,
      fieldIds: ['f1', 'f2'],
      sackIds: ['s1', 's2'],
      createdAt: '2026-11-12T18:00:00Z',
    });
    campaign = addOil(campaign, {
      id: 'o1',
      date: '2026-11-12',
      amount: 72,
      unit: 'kg',
      millWeightIds: ['m1'],
      fieldIds: ['f1', 'f2'],
      createdAt: '2026-11-12T19:00:00Z',
    });

    const totals = campaignTotals(campaign);
    expect(totals.officialKg).toBe(420);
    expect(totals.oilKg).toBe(72);

    const rows = fieldSummaries(campaign, ['f1', 'f2']);
    const f1 = rows.find((r) => r.fieldId === 'f1')!;
    const f2 = rows.find((r) => r.fieldId === 'f2')!;
    expect(f1.officialKg).toBeCloseTo(280, 5);
    expect(f2.officialKg).toBeCloseTo(140, 5);
    expect(f1.oilKg).toBeCloseTo(48, 5);
    expect(f2.oilKg).toBeCloseTo(24, 5);
    expect(f1.oilKg + f2.oilKg).toBeCloseTo(72, 5);
    expect(f1.shared).toBe(true);
    expect(f2.shared).toBe(true);
  });
});

import { emptyCampaign, type HarvestCampaign } from './types';
import { unconfirmedSacks } from './storage';
import { campaignTotals, oilAmountToKg } from './totals';
import { pendingSacksByDay, suggestMillIncludes, harvestChainStatus } from './chain';

describe('harvest chain helpers', () => {
  const base: HarvestCampaign = {
    ...emptyCampaign(2026),
    status: 'active',
    fieldOrder: ['f1', 'f2'],
    sacks: [
      {
        id: 's1',
        date: '2026-11-10',
        fieldId: 'f1',
        sacks: 20,
        createdAt: '2026-11-10T10:00:00Z',
      },
      {
        id: 's2',
        date: '2026-11-11',
        fieldId: 'f2',
        sacks: 10,
        createdAt: '2026-11-11T10:00:00Z',
      },
      {
        id: 's3',
        date: '2026-11-12',
        fieldId: 'f1',
        sacks: 5,
        createdAt: '2026-11-12T10:00:00Z',
      },
    ],
  };

  it('groups pending sacks by day newest first', () => {
    const groups = pendingSacksByDay(base);
    expect(groups.map((g) => g.date)).toEqual(['2026-11-12', '2026-11-11', '2026-11-10']);
    expect(groups[0].sackCount).toBe(5);
  });

  it('suggests last three pending days and excludes future sacks', () => {
    const suggested = suggestMillIncludes(base, '2026-11-11');
    expect(suggested.map((s) => s.id).sort()).toEqual(['s1', 's2']);
  });

  it('does not treat weighed sacks as pending', () => {
    const linked = {
      ...base,
      sacks: base.sacks.map((s) =>
        s.id === 's1' ? { ...s, millWeightId: 'm1' } : s
      ),
      millWeights: [
        {
          id: 'm1',
          date: '2026-11-11',
          kg: 400,
          fieldIds: ['f1'],
          sackIds: ['s1'],
          createdAt: '2026-11-11T18:00:00Z',
        },
      ],
    };
    expect(unconfirmedSacks(linked).map((s) => s.id).sort()).toEqual(['s2', 's3']);
    expect(campaignTotals(linked).unweighedSacks).toBe(15);
    expect(
      oilAmountToKg({
        id: 'o',
        date: '',
        amount: 10,
        unit: 'kg',
        millWeightIds: [],
        fieldIds: [],
        createdAt: '',
      })
    ).toBe(10);
  });

  it('does not advertise an implausible latest yield', () => {
    const campaign: HarvestCampaign = {
      ...emptyCampaign(2026),
      status: 'active',
      millWeights: [
        {
          id: 'm1',
          date: '2026-09-21',
          kg: 10,
          fieldIds: ['f1'],
          sackIds: [],
          createdAt: '2026-09-21T18:00:00Z',
        },
      ],
      oils: [
        {
          id: 'o1',
          date: '2026-09-21',
          amount: 65,
          unit: 'kg',
          millWeightIds: ['m1'],
          fieldIds: ['f1'],
          createdAt: '2026-09-21T19:00:00Z',
        },
      ],
    };
    expect(harvestChainStatus(campaign).latestCompleteYield).toBeNull();
  });
});

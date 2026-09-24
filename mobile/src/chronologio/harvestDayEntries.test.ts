import {
  chronologioEntriesFromHarvestDays,
  mergeHarvestDayCards,
  mergeHarvestDayTimeline,
} from './harvestDayEntries';
import type { HarvestDaySummary } from '../harvestCampaign/totals';
import type { ChronologioEntry } from '../services/chronologioService';
import type { Field } from '../services/fieldService';

const day = (overrides: Partial<HarvestDaySummary> & { date: string }): HarvestDaySummary => ({
  sacks: 0,
  estimatedKg: 0,
  officialKg: 0,
  people: 0,
  personDays: 0,
  expenseEur: 0,
  oilKg: 0,
  photos: 0,
  fieldIds: ['f1'],
  closed: false,
  ...overrides,
});

const fields = [{ id: 'f1', name: 'Grove A', color: '#a65d4e' }] as Field[];

describe('chronologioEntriesFromHarvestDays', () => {
  it('builds one Harvest:day card per productive day', () => {
    const entries = chronologioEntriesFromHarvestDays(
      [
        day({ date: '2026-09-21', sacks: 22, officialKg: 56, oilKg: 68 }),
        day({ date: '2026-09-20', sacks: 0 }),
      ],
      fields
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('Harvest:day:2026-09-21');
    expect(entries[0].details.harvest?.sackCount).toBe(22);
    expect(entries[0].details.harvest?.oliveKg).toBe(56);
    expect(entries[0].details.harvest?.oilKg).toBe(68);
    expect(entries[0].details.harvest?.hasOfficialWeight).toBe(true);
  });
});

describe('mergeHarvestDayTimeline', () => {
  it('keeps campaign day cards and drops API harvests for the same day', () => {
    const campaign = chronologioEntriesFromHarvestDays(
      [day({ date: '2026-09-21', sacks: 22, officialKg: 56 })],
      fields
    );
    const api = [
      {
        id: 'Harvest:abc',
        category: 'harvest',
        occurredAt: '2026-09-21T10:00:00',
        sourceType: 'Harvest',
      } as ChronologioEntry,
      {
        id: 'Note:1',
        category: 'note',
        occurredAt: '2026-09-21T09:00:00',
        sourceType: 'Note',
      } as ChronologioEntry,
    ];
    const merged = mergeHarvestDayTimeline(api, campaign);
    expect(merged.map((e) => e.id)).toEqual(['Harvest:day:2026-09-21', 'Note:1']);
  });
});

describe('mergeHarvestDayCards', () => {
  it('lets later groups win on the same day id', () => {
    const fromDb = chronologioEntriesFromHarvestDays(
      [day({ date: '2026-09-21', sacks: 10, officialKg: 20 })],
      fields
    );
    const fromCampaign = chronologioEntriesFromHarvestDays(
      [day({ date: '2026-09-21', sacks: 22, officialKg: 56 })],
      fields
    );
    const merged = mergeHarvestDayCards(fromDb, fromCampaign);
    expect(merged).toHaveLength(1);
    expect(merged[0].details.harvest?.sackCount).toBe(22);
  });
});

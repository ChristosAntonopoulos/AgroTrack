import type { HarvestRecord } from '../services/harvestService';
import {
  findPostedHarvestRecord,
  harvestRecordsForDay,
  resolveHistoricalHarvestLink,
  summarizeHistoricalDay,
} from './historicalDay';

const row = (partial: Partial<HarvestRecord> & Pick<HarvestRecord, 'id' | 'fieldId'>): HarvestRecord => ({
  harvestDate: '2026-09-21',
  harvestMethod: 'sacks',
  workersUsed: 0,
  oliveKg: 0,
  qualityGrade: 'A',
  status: 'posted',
  ...partial,
});

describe('resolveHistoricalHarvestLink', () => {
  it('prefers harvestId + fieldId for a single record', () => {
    expect(
      resolveHistoricalHarvestLink({ harvestId: 'h1', fieldId: 'f1', day: '2026-09-21' })
    ).toEqual({ kind: 'record', harvestId: 'h1', fieldId: 'f1' });
  });

  it('opens a historical day when day + fieldId are present', () => {
    expect(resolveHistoricalHarvestLink({ day: '2026-09-21', fieldId: 'f1' })).toEqual({
      kind: 'day',
      day: '2026-09-21',
      fieldId: 'f1',
    });
  });

  it('rejects invalid day keys', () => {
    expect(resolveHistoricalHarvestLink({ day: '21-09-2026', fieldId: 'f1' })).toEqual({
      kind: 'idle',
    });
  });
});

describe('harvestRecordsForDay', () => {
  const rows = [
    row({ id: 'a', fieldId: 'f1', harvestDate: '2026-09-21', sackCount: 33 }),
    row({ id: 'b', fieldId: 'f1', harvestDate: '2026-09-20', sackCount: 10 }),
    row({ id: 'c', fieldId: 'f2', harvestDate: '2026-09-21', sackCount: 5 }),
    row({ id: 'd', fieldId: 'f1', harvestDate: '2026-09-21', status: 'voided', sackCount: 99 }),
  ];

  it('filters by Athens day, field, and posted status', () => {
    expect(harvestRecordsForDay(rows, '2026-09-21', 'f1').map((r) => r.id)).toEqual(['a']);
  });
});

describe('findPostedHarvestRecord', () => {
  it('returns null for voided or missing', () => {
    const rows = [
      row({ id: 'a', fieldId: 'f1', status: 'voided' }),
      row({ id: 'b', fieldId: 'f1' }),
    ];
    expect(findPostedHarvestRecord(rows, 'a')).toBeNull();
    expect(findPostedHarvestRecord(rows, 'missing')).toBeNull();
    expect(findPostedHarvestRecord(rows, 'b')?.id).toBe('b');
  });
});

describe('summarizeHistoricalDay', () => {
  it('sums sacks and kg', () => {
    expect(
      summarizeHistoricalDay([
        row({ id: 'a', fieldId: 'f1', sackCount: 20, oliveKg: 100, oilKg: 10, workersUsed: 2 }),
        row({ id: 'b', fieldId: 'f1', sackCount: 13, oliveKg: 0, oilKg: 0, workersUsed: 1 }),
      ])
    ).toEqual({ sacks: 33, oliveKg: 100, oilKg: 10, workers: 3, count: 2 });
  });
});

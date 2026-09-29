import type { HarvestRecord } from '../services/harvestService';
import {
  campaignFromHarvestRecords,
  filterSeasonHarvestRecords,
  mergeCampaignWithHydrated,
  pruneCampaignToKnownFields,
} from './hydrateFromRecords';
import { emptyCampaign } from './types';

const baseRecord = (partial: Partial<HarvestRecord> & Pick<HarvestRecord, 'id' | 'fieldId'>): HarvestRecord => ({
  harvestDate: '2025-11-10T12:00:00.000Z',
  harvestMethod: 'mill',
  workersUsed: 0,
  oliveKg: 0,
  qualityGrade: 'A',
  status: 'posted',
  ...partial,
});

describe('filterSeasonHarvestRecords', () => {
  it('keeps posted rows in the season and drops voided / other seasons', () => {
    const rows = [
      baseRecord({ id: '1', fieldId: 'a', harvestDate: '2025-11-01T12:00:00Z', oliveKg: 100 }),
      baseRecord({ id: '2', fieldId: 'a', harvestDate: '2024-11-01T12:00:00Z', oliveKg: 50 }),
      baseRecord({
        id: '3',
        fieldId: 'a',
        harvestDate: '2025-11-02T12:00:00Z',
        oliveKg: 10,
        status: 'voided',
      }),
    ];
    const filtered = filterSeasonHarvestRecords(rows, 2025);
    expect(filtered.map((r) => r.id)).toEqual(['1']);
  });
});

describe('campaignFromHarvestRecords', () => {
  it('builds sacks, mill batch, oil, people and marks active', () => {
    const rows = [
      baseRecord({
        id: 's1',
        fieldId: '088',
        harvestMethod: 'sacks',
        sackCount: 12,
        oliveKg: 0,
      }),
      baseRecord({
        id: 'm1',
        fieldId: '088',
        harvestMethod: 'mill',
        oliveKg: 400,
        batchId: 'b1',
        allocationWeight: 12,
        notes: 'receipt: T-99',
      }),
      baseRecord({
        id: 'm2',
        fieldId: '089',
        harvestMethod: 'mill',
        oliveKg: 200,
        batchId: 'b1',
        allocationWeight: 6,
      }),
      baseRecord({
        id: 'o1',
        fieldId: '088',
        harvestMethod: 'oil',
        oliveKg: 0,
        oilKg: 80,
      }),
      baseRecord({
        id: 'p1',
        fieldId: '088',
        harvestMethod: 'people',
        workersUsed: 3,
        oliveKg: 0,
        notes: 'full · 120€',
      }),
    ];
    const campaign = campaignFromHarvestRecords(rows, 2025);
    expect(campaign.status).toBe('active');
    expect(campaign.fieldOrder).toEqual(['088', '089']);
    expect(campaign.sacks).toHaveLength(1);
    expect(campaign.sacks[0].sacks).toBe(12);
    expect(campaign.millWeights).toHaveLength(1);
    expect(campaign.millWeights[0].kg).toBe(600);
    expect(campaign.millWeights[0].fieldIds).toEqual(['088', '089']);
    expect(campaign.millWeights[0].receiptRef).toBe('T-99');
    expect(campaign.oils).toHaveLength(1);
    expect(campaign.oils[0].amount).toBe(80);
    expect(campaign.peopleLogs[0].people).toBe(3);
    expect(campaign.peopleLogs[0].costEur).toBe(120);
  });
});

describe('mergeCampaignWithHydrated', () => {
  it('activates idle local and appends missing server entries', () => {
    const local = emptyCampaign(2025);
    const hydrated = campaignFromHarvestRecords(
      [
        baseRecord({
          id: 'm1',
          fieldId: '088',
          harvestMethod: 'mill',
          oliveKg: 100,
        }),
      ],
      2025
    );
    const merged = mergeCampaignWithHydrated(local, hydrated);
    expect(merged.status).toBe('active');
    expect(merged.millWeights).toHaveLength(1);
    expect(merged.fieldOrder).toContain('088');
  });

  it('does not duplicate known harvestRecordIds and keeps closed', () => {
    const local = {
      ...emptyCampaign(2025),
      status: 'closed' as const,
      millWeights: [
        {
          id: 'local-m',
          date: '2025-11-10',
          kg: 100,
          fieldIds: ['088'],
          sackIds: [],
          harvestRecordId: 'm1',
          createdAt: '2025-11-10',
        },
      ],
    };
    const hydrated = campaignFromHarvestRecords(
      [baseRecord({ id: 'm1', fieldId: '088', harvestMethod: 'mill', oliveKg: 100 })],
      2025
    );
    const merged = mergeCampaignWithHydrated(local, hydrated);
    expect(merged.status).toBe('closed');
    expect(merged.millWeights).toHaveLength(1);
  });
});

describe('pruneCampaignToKnownFields', () => {
  it('drops retired field ids and their sacks from the journey', () => {
    const local = {
      ...emptyCampaign(2026),
      status: 'active' as const,
      fieldOrder: ['101', '102', '103'],
      groveDoneIds: ['102'],
      sacks: [
        {
          id: 's1',
          date: '2026-09-19',
          fieldId: '101',
          sacks: 17,
          createdAt: '2026-09-19',
        },
        {
          id: 's2',
          date: '2026-09-19',
          fieldId: '102',
          sacks: 40,
          createdAt: '2026-09-19',
        },
      ],
      millWeights: [
        {
          id: 'm1',
          date: '2026-09-21',
          kg: 500,
          fieldIds: ['101', '102'],
          sackIds: ['s1', 's2'],
          createdAt: '2026-09-21',
        },
        {
          id: 'm2',
          date: '2026-09-22',
          kg: 200,
          fieldIds: ['103'],
          sackIds: [],
          createdAt: '2026-09-22',
        },
      ],
    };

    const pruned = pruneCampaignToKnownFields(local, ['101']);
    expect(pruned.fieldOrder).toEqual(['101']);
    expect(pruned.groveDoneIds).toEqual([]);
    expect(pruned.sacks).toHaveLength(1);
    expect(pruned.sacks[0].fieldId).toBe('101');
    expect(pruned.millWeights).toHaveLength(1);
    expect(pruned.millWeights[0].fieldIds).toEqual(['101']);
    expect(pruned.millWeights[0].sackIds).toEqual(['s1']);
  });
});

import { emptyCampaign } from './types';
import {
  addExpense,
  addMillWeight,
  addPeople,
  addSack,
  linkSacksToMill,
  moveField,
  parseCampaign,
  startCampaign,
  stopCampaign,
  toggleGroveDone,
  upsertDayLog,
} from './storage';
import { campaignTotals, daySummary } from './totals';

describe('harvest campaign storage', () => {
  it('starts, reorders, and stops a campaign without a mill name', () => {
    const started = startCampaign(
      emptyCampaign(2026),
      { fieldOrder: ['a', 'b', 'c'] },
      new Date('2026-11-12T08:00:00Z')
    );

    expect(started.status).toBe('active');
    expect(started.millName).toBe('');
    expect(moveField(started.fieldOrder, 'c', -1)).toEqual(['a', 'c', 'b']);

    const closed = stopCampaign(started, new Date('2026-12-01T10:00:00Z'));
    expect(closed.status).toBe('closed');
    expect(closed.closedAt).toBe('2026-12-01T10:00:00.000Z');
  });

  it('marks groves done and logs a skip without dropping kilos', () => {
    let campaign = startCampaign(emptyCampaign(2026), { fieldOrder: ['north', 'south'] });
    campaign = toggleGroveDone(campaign, 'north');
    campaign = upsertDayLog(campaign, { date: '2026-11-13', oliveKg: 420, fieldId: 'south' });
    campaign = upsertDayLog(campaign, { date: '2026-11-14', skipped: true, skipReason: 'rain' });

    expect(campaign.groveDoneIds).toEqual(['north']);
    expect(campaign.dayLogs).toHaveLength(2);
    expect(campaign.dayLogs[0].oliveKg).toBe(420);
    expect(campaign.dayLogs[1].skipReason).toBe('rain');
  });

  it('ignores corrupt stored JSON', () => {
    expect(parseCampaign({ status: 'nope', fieldOrder: 'x' }, 2026).status).toBe('idle');
    expect(parseCampaign(null, 2026).fieldOrder).toEqual([]);
  });

  it('migrates older day logs into mill weights and people', () => {
    const parsed = parseCampaign(
      {
        status: 'active',
        fieldOrder: ['south'],
        dayLogs: [{ date: '2026-11-13', oliveKg: 420, fieldId: 'south', people: 4 }],
      },
      2026
    );
    expect(parsed.millWeights).toHaveLength(1);
    expect(parsed.millWeights[0].kg).toBe(420);
    expect(parsed.peopleLogs[0].people).toBe(4);
  });
});

describe('harvest campaign totals', () => {
  it('does not add sack estimates to official mill kilograms', () => {
    let campaign = startCampaign(emptyCampaign(2026), { fieldOrder: ['f1'] });
    campaign = addSack(campaign, {
      id: 's1',
      date: '2026-11-12',
      fieldId: 'f1',
      sacks: 12,
      kgPerSack: 45,
      createdAt: '2026-11-12T10:00:00Z',
    });
    campaign = addSack(campaign, {
      id: 's2',
      date: '2026-11-13',
      fieldId: 'f1',
      sacks: 8,
      kgPerSack: 45,
      createdAt: '2026-11-13T10:00:00Z',
    });

    const before = campaignTotals(campaign);
    expect(before.officialKg).toBe(0);
    expect(before.unweighedSacks).toBe(20);
    expect(before.unweighedEstimatedKg).toBe(900);

    campaign = addMillWeight(campaign, {
      id: 'm1',
      date: '2026-11-13',
      kg: 860,
      fieldIds: ['f1'],
      sackIds: ['s1', 's2'],
      createdAt: '2026-11-13T18:00:00Z',
    });

    const after = campaignTotals(campaign);
    expect(after.officialKg).toBe(860);
    expect(after.unweighedSacks).toBe(0);
    expect(after.unweighedEstimatedKg).toBe(0);
    expect(after.officialKg + after.unweighedEstimatedKg).toBe(860);

    const today = daySummary(campaign, '2026-11-13');
    expect(today.officialKg).toBe(860);
    expect(today.sacks).toBe(8);
    expect(today.estimatedKg).toBe(0);
  });

  it('links sacks to a mill weight after the kilograms are saved', () => {
    let campaign = startCampaign(emptyCampaign(2026), { fieldOrder: ['f1'] });
    campaign = addSack(campaign, {
      id: 's1',
      date: '2026-11-12',
      fieldId: 'f1',
      sacks: 12,
      kgPerSack: 45,
      createdAt: '2026-11-12T10:00:00Z',
    });
    campaign = addMillWeight(campaign, {
      id: 'm1',
      date: '2026-11-12',
      kg: 860,
      fieldIds: ['f1'],
      sackIds: [],
      createdAt: '2026-11-12T18:00:00Z',
    });
    campaign = linkSacksToMill(campaign, 'm1', ['s1']);
    expect(campaign.sacks[0].millWeightId).toBe('m1');
    expect(campaignTotals(campaign).unweighedSacks).toBe(0);
  });

  it('keeps unlinked sacks as estimates beside later official weight', () => {
    let campaign = startCampaign(emptyCampaign(2026), { fieldOrder: ['f1'] });
    campaign = addSack(campaign, {
      id: 's1',
      date: '2026-11-12',
      fieldId: 'f1',
      sacks: 12,
      kgPerSack: 45,
      createdAt: '2026-11-12T10:00:00Z',
    });
    campaign = addMillWeight(campaign, {
      id: 'm1',
      date: '2026-11-14',
      kg: 860,
      fieldIds: ['f1'],
      sackIds: [],
      createdAt: '2026-11-14T18:00:00Z',
    });

    const totals = campaignTotals(campaign);
    expect(totals.officialKg).toBe(860);
    expect(totals.unweighedSacks).toBe(12);
    expect(totals.unweighedEstimatedKg).toBe(540);
  });

  it('counts people as person-days without names', () => {
    let campaign = startCampaign(emptyCampaign(2026), { fieldOrder: ['f1'] });
    campaign = addPeople(campaign, {
      id: 'p1',
      date: '2026-11-12',
      people: 4,
      hours: 'full',
      costEur: 200,
      createdAt: '2026-11-12T18:00:00Z',
    });
    const totals = campaignTotals(campaign);
    expect(totals.personDays).toBe(4);
    expect(totals.expenseEur).toBe(200);
  });

  it('counts people cost and harvest expenses once', () => {
    let campaign = startCampaign(emptyCampaign(2026), { fieldOrder: ['f1'] });
    campaign = addPeople(campaign, {
      id: 'p1',
      date: '2026-11-12',
      people: 4,
      hours: 'full',
      costEur: 200,
      addedToMoney: true,
      createdAt: '2026-11-12T18:00:00Z',
    });
    campaign = addExpense(campaign, {
      id: 'e1',
      date: '2026-11-12',
      amountEur: 50,
      createdAt: '2026-11-12T18:30:00Z',
    });
    expect(campaignTotals(campaign).expenseEur).toBe(250);
    expect(daySummary(campaign, '2026-11-12').expenseEur).toBe(250);
  });
});

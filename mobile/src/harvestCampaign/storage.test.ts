import { emptyCampaign } from './types';
import {
  moveField,
  parseCampaign,
  startCampaign,
  stopCampaign,
  toggleGroveDone,
  upsertDayLog,
} from './storage';

describe('harvest campaign storage', () => {
  it('starts, reorders, and stops a campaign', () => {
    const started = startCampaign(
      emptyCampaign(2026),
      {
        fieldOrder: ['a', 'b', 'c'],
        millName: 'Φιλιατρών',
      },
      new Date('2026-11-12T08:00:00Z')
    );

    expect(started.status).toBe('active');
    expect(started.millName).toBe('Φιλιατρών');
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
});

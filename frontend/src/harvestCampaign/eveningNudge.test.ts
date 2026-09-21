import { emptyCampaign } from './types';
import { addSack, closeHarvestDay, startCampaign } from './storage';
import { harvestEveningNudge } from './eveningNudge';

const evening = new Date('2026-11-12T18:30:00+02:00');
const morning = new Date('2026-11-13T09:00:00+02:00');

describe('harvest evening nudge', () => {
  it('asks to close today after 17:00 Athens', () => {
    const campaign = startCampaign(emptyCampaign(2026), { fieldOrder: ['f1'] });
    expect(harvestEveningNudge(campaign, '2026-11-12', evening)?.kind).toBe('today');
  });

  it('does not nag a closed day in the evening', () => {
    let campaign = startCampaign(emptyCampaign(2026), { fieldOrder: ['f1'] });
    campaign = closeHarvestDay(campaign, '2026-11-12');
    expect(harvestEveningNudge(campaign, '2026-11-12', evening)).toBeNull();
  });

  it('reminds about yesterday if that day had records and was not closed', () => {
    let campaign = startCampaign(emptyCampaign(2026), { fieldOrder: ['f1'] });
    campaign = addSack(campaign, {
      id: 's1',
      date: '2026-11-12',
      fieldId: 'f1',
      sacks: 12,
      createdAt: '2026-11-12T10:00:00Z',
    });
    const nudge = harvestEveningNudge(campaign, '2026-11-13', morning);
    expect(nudge).toEqual({ date: '2026-11-12', kind: 'yesterday' });
  });
});

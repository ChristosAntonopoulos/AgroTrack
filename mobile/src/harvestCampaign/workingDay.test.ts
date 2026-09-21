import { clampHarvestWorkingDay, harvestDayStripDates, shiftHarvestWorkingDay } from './workingDay';
import { emptyCampaign } from './types';

describe('harvest working day', () => {
  const today = '2026-11-14';
  const campaign = {
    ...emptyCampaign(2026),
    status: 'active' as const,
    startedAt: '2026-11-10T08:00:00.000Z',
  };

  it('clamps future days back to today', () => {
    expect(clampHarvestWorkingDay('2026-11-20', campaign, today)).toBe(today);
  });

  it('clamps before campaign start up to the start day', () => {
    expect(clampHarvestWorkingDay('2026-11-01', campaign, today)).toBe('2026-11-10');
  });

  it('keeps a valid in-range day', () => {
    expect(clampHarvestWorkingDay('2026-11-12', campaign, today)).toBe('2026-11-12');
  });

  it('falls back to today for invalid keys', () => {
    expect(clampHarvestWorkingDay('nope', campaign, today)).toBe(today);
    expect(clampHarvestWorkingDay(null, campaign, today)).toBe(today);
  });

  it('shifts within the allowed range', () => {
    expect(shiftHarvestWorkingDay('2026-11-12', -1, campaign, today)).toBe('2026-11-11');
    expect(shiftHarvestWorkingDay(today, 1, campaign, today)).toBe(today);
    expect(shiftHarvestWorkingDay('2026-11-10', -1, campaign, today)).toBe('2026-11-10');
  });

  it('lists every choosable day from campaign start through today', () => {
    expect(harvestDayStripDates(campaign, today)).toEqual([
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
    ]);
  });

  it('includes yesterday so day deep links appear as a choice', () => {
    const early = {
      ...emptyCampaign(2026),
      status: 'active' as const,
      startedAt: '2026-09-18T06:00:00.000Z',
    };
    const strip = harvestDayStripDates(early, '2026-09-20');
    expect(strip).toContain('2026-09-19');
    expect(clampHarvestWorkingDay('2026-09-19', early, '2026-09-20')).toBe('2026-09-19');
  });
});

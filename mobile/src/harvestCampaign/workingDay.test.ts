import {
  clampHarvestWorkingDay,
  extendHarvestStripBounds,
  harvestDayStripDates,
  harvestStripWindow,
  shiftHarvestWorkingDay,
} from './workingDay';
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
    expect(shiftHarvestWorkingDay(today, 1, campaign, today)).toBe('2026-11-15');
    expect(shiftHarvestWorkingDay('2026-11-10', -1, campaign, today)).toBe('2026-11-09');
  });

  it('shows five calendar days on each side of today, including future days', () => {
    const season = {
      ...emptyCampaign(2026),
      status: 'active' as const,
      startedAt: '2026-09-01T06:00:00.000Z',
    };
    const bounds = harvestStripWindow('2026-11-14', season, '2026-11-14');
    expect(harvestDayStripDates(season, '2026-11-14', bounds)).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
    ]);
  });

  it('shows five calendar days on each side when the open day is in the middle', () => {
    const season = {
      ...emptyCampaign(2026),
      status: 'active' as const,
      startedAt: '2026-09-01T06:00:00.000Z',
    };
    const bounds = harvestStripWindow('2026-11-08', season, '2026-11-14');
    expect(bounds).toEqual({ from: '2026-11-03', to: '2026-11-13' });
    expect(harvestDayStripDates(season, '2026-11-14', bounds)).toHaveLength(11);
  });

  it('shows five calendar days before today even when the harvest started today', () => {
    const fresh = {
      ...emptyCampaign(2026),
      status: 'active' as const,
      startedAt: '2026-11-14T08:00:00.000Z',
    };
    expect(harvestStripWindow('2026-11-14', fresh, '2026-11-14')).toEqual({
      from: '2026-11-09',
      to: '2026-11-19',
    });
  });

  it('adds another five days when the user asks for more', () => {
    const season = {
      ...emptyCampaign(2026),
      status: 'active' as const,
      startedAt: '2026-11-14T08:00:00.000Z',
    };
    const first = harvestStripWindow('2026-11-14', season, '2026-11-14');
    expect(extendHarvestStripBounds(first, -1, season, '2026-11-14').from).toBe('2026-11-04');
    expect(extendHarvestStripBounds(first, 1, season, '2026-11-14').to).toBe('2026-11-24');
  });

  it('honors a ?day= style selection after clamp', () => {
    const fromUrl = '2026-11-12';
    expect(clampHarvestWorkingDay(fromUrl, campaign, today)).toBe(fromUrl);
  });
});

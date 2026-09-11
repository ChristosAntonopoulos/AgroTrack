import { calendarRodPhase, nextCalendarRodPhase, seasonStoryState } from './seasonStory';

describe('seasonStory', () => {
  it('places September in fruit growth, with harvest next', () => {
    expect(calendarRodPhase(new Date(2026, 8, 11))).toBe('fruit_growth');
    expect(nextCalendarRodPhase('fruit_growth')).toBe('harvest');
  });

  it('places November in harvest, with no later phase', () => {
    expect(calendarRodPhase(new Date(2026, 10, 8))).toBe('harvest');
    expect(nextCalendarRodPhase('harvest')).toBeNull();
  });

  it('tells a growing year until kilos arrive', () => {
    expect(seasonStoryState({ oliveKg: 0, oilKg: 0, harvestClosed: false })).toBe('growing');
    expect(seasonStoryState({ oliveKg: 120, oilKg: 0, harvestClosed: false })).toBe('harvesting');
    expect(seasonStoryState({ oliveKg: 120, oilKg: 18, harvestClosed: true })).toBe('closing');
  });
});

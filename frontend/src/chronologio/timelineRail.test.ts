import { nearbyMonthWindow, shortMonthLabel, timelineDotFor, isCompletedTaskEntry } from './timelineRail';
import type { ChronologioEntry } from '../services/chronologioService';

const months = [
  { key: '2026-10', year: 2026, month: 10 },
  { key: '2026-09', year: 2026, month: 9 },
  { key: '2026-08', year: 2026, month: 8 },
  { key: '2026-07', year: 2026, month: 7 },
];

describe('nearbyMonthWindow', () => {
  it('shows a short spine around the active month', () => {
    expect(nearbyMonthWindow(months, '2026-09').map((m) => m.key)).toEqual([
      '2026-10',
      '2026-09',
      '2026-08',
      '2026-07',
    ]);
  });

  it('does not invent months before the newest or after the oldest', () => {
    expect(nearbyMonthWindow(months, '2026-10').map((m) => m.key)).toEqual([
      '2026-10',
      '2026-09',
      '2026-08',
    ]);
    expect(nearbyMonthWindow(months, '2026-07').map((m) => m.key)).toEqual(['2026-09', '2026-08', '2026-07']);
  });
});

describe('shortMonthLabel', () => {
  it('uses compact Greek month labels', () => {
    expect(shortMonthLabel(9, 'el')).toBe('ΣΕΠ');
    expect(shortMonthLabel(10, 'el-GR')).toBe('ΟΚΤ');
    expect(shortMonthLabel(6, 'el')).toBe('ΙΟΥΝ');
    expect(shortMonthLabel(7, 'el')).toBe('ΙΟΥΛ');
  });
});

describe('timelineDotFor', () => {
  it('maps records onto the four type colours', () => {
    expect(timelineDotFor('task')).toBe('task');
    expect(timelineDotFor('photo')).toBe('observation');
    expect(timelineDotFor('note')).toBe('observation');
    expect(timelineDotFor('expense')).toBe('money');
    expect(timelineDotFor('income')).toBe('money');
    expect(timelineDotFor('harvest')).toBe('harvest');
    expect(timelineDotFor('weather')).toBe('other');
  });
});

describe('isCompletedTaskEntry', () => {
  it('counts completed tasks only', () => {
    const entry = (status: string, category = 'task') =>
      ({ category, details: { task: { status } } }) as ChronologioEntry;
    expect(isCompletedTaskEntry(entry('completed'))).toBe(true);
    expect(isCompletedTaskEntry(entry('done'))).toBe(true);
    expect(isCompletedTaskEntry(entry('pending'))).toBe(false);
    expect(isCompletedTaskEntry(entry('completed', 'note'))).toBe(false);
  });
});

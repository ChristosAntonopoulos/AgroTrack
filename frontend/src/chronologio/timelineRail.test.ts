import {
  nearbyMonthWindow,
  shortMonthLabel,
  railMonthLabel,
  monthFocusKey,
  yearGlanceSlots,
  timelineDotFor,
  isCompletedTaskEntry,
} from './timelineRail';
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

describe('railMonthLabel', () => {
  it('uses the short Greek forms from the navigator', () => {
    expect(railMonthLabel(9, 'el')).toBe('Σεπ');
    expect(railMonthLabel(10, 'el')).toBe('Οκτ');
    expect(railMonthLabel(11, 'el')).toBe('Νοε');
    expect(railMonthLabel(12, 'el')).toBe('Δεκ');
  });
});

describe('monthFocusKey', () => {
  it('names a harvest month even when other records are present', () => {
    expect(monthFocusKey({ harvest: 1, work: 4, observation: 2, money: 1 })).toBe('harvest');
    expect(monthFocusKey({ harvest: 0, work: 1, observation: 3, money: 0 })).toBe('observation');
    expect(monthFocusKey({ harvest: 0, work: 0, observation: 0, money: 0 })).toBeNull();
  });
});

describe('yearGlanceSlots', () => {
  it('keeps two or three totals and leads with oil', () => {
    expect(
      yearGlanceSlots({ oilKg: 80, oliveKg: 400, expenseTotal: 120, recordCount: 14 })
    ).toEqual(['oil', 'expenses', 'records']);
    expect(yearGlanceSlots({ oilKg: 0, oliveKg: 0, expenseTotal: 0, recordCount: 0 })).toEqual([]);
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

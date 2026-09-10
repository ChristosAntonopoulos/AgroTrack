import {
  formatApproximateMonth,
  formatCompactTaskPeriod,
  formatPhenologyWindow,
  formatTaskDateRange,
  formatTaskDay,
} from './taskDateRange';

describe('formatTaskDateRange', () => {
  it('formats a same-year Greek range with the year only at the end', () => {
    expect(formatTaskDateRange('2026-06-01', '2026-06-15', 'el')).toBe('1 Ιουν – 15 Ιουν 2026');
    expect(formatTaskDateRange('2026-08-15', '2026-10-01', 'el')).toBe('15 Αυγ – 1 Οκτ 2026');
  });

  it('keeps both years on a cross-year period', () => {
    expect(formatTaskDateRange('2026-12-01', '2027-01-15', 'el')).toBe(
      '1 Δεκ 2026 – 15 Ιαν 2027'
    );
  });

  it('formats harvest wrap windows that the catalogue stores as Oct–Jan', () => {
    expect(formatTaskDateRange('2026-10-01T00:00:00Z', '2027-01-31T23:59:59.999Z', 'el')).toBe(
      '1 Οκτ 2026 – 31 Ιαν 2027'
    );
  });

  it('never drops the end year the way the old cards did', () => {
    const label = formatTaskDateRange('2026-06-01', '2027-01-01', 'el');
    expect(label).toBe('1 Ιουν 2026 – 1 Ιαν 2027');
    expect(label).not.toMatch(/– 1 Ιαν$/);
  });

  it('formats a single day with a year', () => {
    expect(formatTaskDateRange('2026-06-10', '2026-06-10', 'el')).toBe('10 Ιουν 2026');
    expect(formatTaskDateRange('2026-06-10', undefined, 'el')).toBe('10 Ιουν 2026');
  });

  it('returns empty for missing or invalid dates', () => {
    expect(formatTaskDateRange(undefined, undefined, 'el')).toBe('');
    expect(formatTaskDateRange('not-a-date', 'also-bad', 'el')).toBe('');
    expect(formatTaskDateRange('2026-06-01', 'not-a-date', 'el')).toBe('1 Ιουν 2026');
  });

  it('still shows both years when the end is before the start', () => {
    expect(formatTaskDateRange('2026-06-15', '2026-01-01', 'el')).toBe(
      '15 Ιουν 2026 – 1 Ιαν 2026'
    );
  });
});

describe('compact planned dates', () => {
  it('drops the context year from a same-year planned period', () => {
    expect(formatCompactTaskPeriod('2026-08-15', '2026-10-01', 'el', 2026)).toBe('15 Αυγ – 1 Οκτ');
  });

  it('keeps both years on a cross-year compact period', () => {
    expect(formatCompactTaskPeriod('2026-12-01', '2027-01-15', 'el', 2026)).toBe(
      '1 Δεκ 2026 – 15 Ιαν 2027'
    );
  });

  it('formats a started day without repeating the context year', () => {
    expect(formatTaskDay('2026-09-01', 'el', 2026)).toBe('1 Σεπ');
    expect(formatTaskDay('2025-09-01', 'el', 2026)).toBe('1 Σεπ 2025');
  });
});

describe('approximate and phenology windows', () => {
  it('renders an approximate Greek month', () => {
    expect(formatApproximateMonth(6, 'el')).toBe('Συνήθως τον Ιούνιο');
  });

  it('renders a phenology-based window', () => {
    expect(formatPhenologyWindow('el')).toBe('Όταν ολοκληρωθεί η άνθηση');
  });
});

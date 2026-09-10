import { buildAvailableYears, parseFieldPageTab, parseFieldResultYear } from './fieldPageQuery';

describe('fieldPageQuery', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads tab from the query string', () => {
    expect(parseFieldPageTab(new URLSearchParams('tab=map'))).toBe('map');
    expect(parseFieldPageTab(new URLSearchParams('tab=details'))).toBe('details');
  });

  it('treats legacy mode=chronologio as the Chronologio tab', () => {
    expect(parseFieldPageTab(new URLSearchParams('mode=chronologio'))).toBe('chronologio');
  });

  it('defaults to overview when nothing is stored', () => {
    expect(parseFieldPageTab(new URLSearchParams())).toBe('overview');
  });

  it('reads a valid result year and falls back otherwise', () => {
    expect(parseFieldResultYear(new URLSearchParams('year=2024'), 2026)).toBe(2024);
    expect(parseFieldResultYear(new URLSearchParams('year=nope'), 2026)).toBe(2026);
    expect(parseFieldResultYear(new URLSearchParams(), 2026)).toBe(2026);
  });

  it('always includes the current and previous year in the available list', () => {
    expect(buildAvailableYears(2026, [2023])).toEqual([2026, 2025, 2023]);
  });
});

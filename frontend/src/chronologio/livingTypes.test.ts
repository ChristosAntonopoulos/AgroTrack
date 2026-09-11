import { parseChronologioView, VIEW_TO_ZOOM, viewFromZoom } from './livingTypes';

describe('Chronologio view URL', () => {
  it('accepts the public days/months/years names and the legacy zoom names', () => {
    expect(parseChronologioView('days')).toBe('days');
    expect(parseChronologioView('months')).toBe('months');
    expect(parseChronologioView('years')).toBe('years');
    expect(parseChronologioView('month')).toBe('days');
    expect(parseChronologioView('year')).toBe('months');
    expect(parseChronologioView(null)).toBe('days');
  });

  it('maps public views onto the existing living zoom surfaces', () => {
    expect(VIEW_TO_ZOOM.days).toBe('month');
    expect(VIEW_TO_ZOOM.months).toBe('year');
    expect(VIEW_TO_ZOOM.years).toBe('years');
    expect(viewFromZoom('month')).toBe('days');
  });
});

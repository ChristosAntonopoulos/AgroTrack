import { perAreaForDisplay } from './format';

describe('perAreaForDisplay', () => {
  it('always converts €/ha to €/stremma regardless of locale', () => {
    expect(perAreaForDisplay(100, 'en')).toBe(10);
    expect(perAreaForDisplay(100, 'el')).toBe(10);
    expect(perAreaForDisplay(100, 'it')).toBe(10);
  });

  it('returns null when the API value is missing', () => {
    expect(perAreaForDisplay(null, 'en')).toBeNull();
    expect(perAreaForDisplay(undefined)).toBeNull();
  });
});

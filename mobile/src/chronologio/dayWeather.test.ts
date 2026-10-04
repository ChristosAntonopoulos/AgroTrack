import { buildDayWeatherView, dayWeatherDateKey, weatherGridKey } from './dayWeather';

describe('dayWeather', () => {
  it('treats a fully empty reading as missing, not zero', () => {
    expect(buildDayWeatherView(null).missing).toBe(true);
    expect(buildDayWeatherView({}).missing).toBe(true);
    expect(buildDayWeatherView({ rainMm: null }).rain.kind).toBe('missing');
  });

  it('keeps a measured dry day as zero rain', () => {
    const view = buildDayWeatherView({ currentC: 26, rainMm: 0, windKmh: 8 });
    expect(view.missing).toBe(false);
    expect(view.rain.kind).toBe('zero');
    expect(view.tempLabel).toBe('26°C');
    expect(view.windBft).toBe(2);
  });

  it('formats a temperature range without inventing rain', () => {
    const view = buildDayWeatherView({ minC: 24, maxC: 29 });
    expect(view.tempLabel).toBe('24–29°C');
    expect(view.rain.kind).toBe('missing');
  });

  it('builds an Athens date key for history lookups', () => {
    expect(dayWeatherDateKey('2026-09-08')).toBe('2026-09-08');
  });

  it('rounds weather grid keys like the backend', () => {
    expect(weatherGridKey(37.98376, 23.72751)).toBe('37.98,23.73');
  });
});

import { resolveWeatherKind, weatherDisplayLabel } from './taskWeather';

describe('task weather display', () => {
  it('never treats unknown or missing weather as good', () => {
    expect(resolveWeatherKind(undefined)).toBe('unknown');
    expect(resolveWeatherKind('')).toBe('unknown');
    expect(resolveWeatherKind('unknown')).toBe('unknown');
    expect(resolveWeatherKind('Unknown')).toBe('unknown');
    expect(weatherDisplayLabel('unknown', 'Καλή ημέρα', 'Δεν υπάρχουν αρκετά δεδομένα')).toBe(
      'Δεν υπάρχουν αρκετά δεδομένα'
    );
  });

  it('keeps an explicit good or caution value', () => {
    expect(resolveWeatherKind('good')).toBe('good');
    expect(resolveWeatherKind('caution')).toBe('caution');
    expect(weatherDisplayLabel('good', 'Καλή ημέρα', 'Δεν υπάρχουν αρκετά δεδομένα')).toBe(
      'Καλή ημέρα'
    );
  });
});

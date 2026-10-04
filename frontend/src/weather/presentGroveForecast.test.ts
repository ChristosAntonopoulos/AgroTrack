import { formatForecastRain, presentGroveForecast } from './presentGroveForecast';
import type { DailyForecast, FieldWeather } from '../services/geospatialService';

const day = (date: string, overrides: Partial<DailyForecast> = {}): DailyForecast => ({
  date,
  minTemperatureC: 18,
  maxTemperatureC: 27,
  weatherCode: 1,
  rainMm: 0,
  ...overrides,
});

describe('presentGroveForecast', () => {
  it('keeps today and the next six days, in order', () => {
    const field = {
      days: [
        day('2026-09-21', { weatherCode: 2, maxTemperatureC: 27.4, minTemperatureC: 22.6 }),
        day('2026-09-22', { weatherCode: 61, rainMm: 3.2, maxTemperatureC: 24 }),
        day('2026-09-23', { weatherCode: 95, rainMm: 12.4 }),
        day('2026-09-24'),
        day('2026-09-25'),
        day('2026-09-26'),
        day('2026-09-27', { weatherCode: 0 }),
        day('2026-09-28'),
      ],
    } as FieldWeather;

    const view = presentGroveForecast(field);

    expect(view).toHaveLength(7);
    expect(view[0]).toMatchObject({ date: '2026-09-21', high: 27, low: 23, conditionKey: 'partly' });
    expect(view[1]).toMatchObject({ conditionKey: 'rain', rainMm: 3.2 });
    expect(view[2]).toMatchObject({ conditionKey: 'storm', rainMm: 12.4 });
    expect(view[6]).toMatchObject({ date: '2026-09-27', conditionKey: 'clear' });
  });

  it('uses the sky outside right now for today, and the noon reading for later days', () => {
    const field = {
      current: { weatherCode: 2 },
      days: [day('2026-09-21', { weatherCode: 0 }), day('2026-09-22', { weatherCode: 0 })],
    } as FieldWeather;

    const view = presentGroveForecast(field, '2026-09-21');

    expect(view[0].conditionKey).toBe('partly');
    expect(view[1].conditionKey).toBe('clear');
  });

  it('drops days without a temperature', () => {
    const field = {
      days: [day('2026-09-21', { maxTemperatureC: null, minTemperatureC: null }), day('not-a-date')],
    } as FieldWeather;

    expect(presentGroveForecast(field)).toEqual([]);
    expect(presentGroveForecast(null)).toEqual([]);
  });

  it('hides rain below half a millimetre', () => {
    expect(formatForecastRain(0.2)).toBeNull();
    expect(formatForecastRain(3.24)).toBe('3.2');
    expect(formatForecastRain(12.4)).toBe('12');
  });
});

import type { FieldWeather } from '../services/geospatialService';
import { resolveWeatherImplication, weatherOutlookBuckets } from './fieldWeatherImplication';

const weather = (overrides: Partial<FieldWeather> = {}): FieldWeather =>
  ({
    fieldId: 'f1',
    stale: false,
    current: {
      temperatureC: 18,
      apparentTemperatureC: 17,
      humidityPercent: 60,
      windSpeedKmh: 8,
      windGustKmh: 12,
      precipitationMm: 0,
      weatherCode: 1,
      description: 'Αίθριος',
      highC: 22,
      lowC: 12,
    },
    rain: {
      previous1hMm: 0,
      previous6hMm: 0,
      previous12hMm: 0,
      previous24hMm: 0,
      previous48hMm: 0,
      previous7dMm: 0,
      forecast3hMm: 0,
      forecast6hMm: 0,
      forecast12hMm: 0,
      forecast24hMm: 0,
      forecast48hMm: 0,
    },
    wind: {
      currentSpeedKmh: 8,
      currentGustKmh: 12,
      maxNext6hKmh: 12,
      maxNext12hKmh: 14,
      maxNext24hKmh: 16,
    },
    frost: { level: 'None', confidence: 'medium' },
    evapotranspiration: { todayMm: 0, last7DaysMm: 0 },
    waterBalance: { rainMm: 0, et0Mm: 0, irrigationMm: 0, balanceMm: 0, label: '' },
    metadata: { source: 'open-meteo', valueType: 'modelled' },
    ...overrides,
  }) as FieldWeather;

describe('resolveWeatherImplication', () => {
  it('does not invent a recommendation without enough data', () => {
    expect(resolveWeatherImplication(null).code).toBe('unknown');
    expect(resolveWeatherImplication(weather(), { allowRecommendation: false }).code).toBe('unknown');
    expect(resolveWeatherImplication(weather({ current: undefined }), { allowRecommendation: true }).code).toBe(
      'unknown'
    );
  });

  it('puts frost ahead of rain', () => {
    const result = resolveWeatherImplication(
      weather({
        frost: { level: 'High', confidence: 'medium' },
        rain: { ...weather().rain, forecast24hMm: 8 },
      }),
      { allowRecommendation: true }
    );
    expect(result.code).toBe('frost');
  });

  it('names likely rain without inventing a new date', () => {
    const result = resolveWeatherImplication(
      weather({ rain: { ...weather().rain, forecast24hMm: 3.2 } }),
      { allowRecommendation: true }
    );
    expect(result.code).toBe('rain');
  });

  it('warns about strong wind for spraying', () => {
    const result = resolveWeatherImplication(
      weather({ wind: { ...weather().wind, currentSpeedKmh: 28 } }),
      { allowRecommendation: true }
    );
    expect(result.code).toBe('wind');
  });

  it('only shows rain buckets the API actually provided', () => {
    expect(weatherOutlookBuckets(weather()).map((b) => b.key)).toEqual(['h24', 'h48']);
    expect(
      weatherOutlookBuckets(weather({ rain: { ...weather().rain, forecast72hMm: 4 } })).map((b) => b.key)
    ).toEqual(['h24', 'h48', 'h72']);
  });
});

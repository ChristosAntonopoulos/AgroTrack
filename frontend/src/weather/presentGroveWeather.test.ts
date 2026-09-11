import { presentGroveWeather } from './presentGroveWeather';
import type { FieldWeather } from '../services/geospatialService';

const weather = (overrides: Partial<FieldWeather> = {}): FieldWeather =>
  ({
    fieldId: '1',
    stale: false,
    rain: { forecast24hMm: 0 } as FieldWeather['rain'],
    wind: { currentSpeedKmh: 8, currentGustKmh: 11 } as FieldWeather['wind'],
    frost: { level: 'None', confidence: 'high' },
    evapotranspiration: { todayMm: 2, last7DaysMm: 12 },
    waterBalance: { rainMm: 0, et0Mm: 2, irrigationMm: 0, balanceMm: -2, label: '' },
    metadata: { source: 'Open-Meteo', valueType: 'modelled' },
    current: {
      temperatureC: 25,
      apparentTemperatureC: 24,
      humidityPercent: 48,
      windSpeedKmh: 8,
      windGustKmh: 11,
      precipitationMm: 0,
      weatherCode: 0,
      description: 'Clear',
      highC: 29,
      lowC: 23,
    },
    ...overrides,
  }) as FieldWeather;

describe('presentGroveWeather', () => {
  it('keeps a fair day quiet: no zero-rain or mild-wind facts', () => {
    const view = presentGroveWeather({ field: weather() });
    expect(view.mood).toBe('clear');
    expect(view.facts).toEqual([]);
    expect(view.readingKey).toBe('reading.fair');
  });

  it('promotes frost above everything else', () => {
    const view = presentGroveWeather({
      field: weather({
        frost: { level: 'High', forecastMinTempC: 1, confidence: 'high' },
        current: {
          ...weather().current!,
          lowC: 1,
          temperatureC: 6,
        },
      }),
    });
    expect(view.mood).toBe('frost');
    expect(view.facts[0].id).toBe('frost');
    expect(view.facts[0].harsh).toBe(true);
  });

  it('shows coming rain only when it is real rain', () => {
    const dry = presentGroveWeather({
      field: weather({ rain: { forecast24hMm: 0.2 } as FieldWeather['rain'] }),
    });
    expect(dry.facts.some((f) => f.id === 'rainSoon')).toBe(false);

    const wet = presentGroveWeather({
      field: weather({ rain: { forecast24hMm: 9 } as FieldWeather['rain'] }),
    });
    expect(wet.mood).toBe('rain');
    expect(wet.facts.some((f) => f.id === 'rainSoon' && f.harsh)).toBe(true);
  });

  it('shows feels-like only when it differs from the air temperature', () => {
    const close = presentGroveWeather({ field: weather() });
    expect(close.feelsLike).toBeNull();

    const hotFeel = presentGroveWeather({
      field: weather({
        current: {
          ...weather().current!,
          temperatureC: 28,
          apparentTemperatureC: 33,
        },
      }),
    });
    expect(hotFeel.feelsLike).toBe(33);
  });

  it('treats a large water deficit as a dry reading, not a fair day', () => {
    const view = presentGroveWeather({
      field: weather({
        waterBalance: {
          rainMm: 0,
          et0Mm: 4,
          irrigationMm: 0,
          balanceMm: -34,
          label: '',
        },
      }),
    });
    expect(view.facts.some((f) => f.id === 'et' && f.harsh)).toBe(true);
    expect(view.readingKey).toBe('reading.dry');
  });
});

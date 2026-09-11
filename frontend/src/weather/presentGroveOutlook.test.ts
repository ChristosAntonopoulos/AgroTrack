import { mergeGroveOutlook, presentGroveOutlook } from './presentGroveOutlook';
import type { FieldWeather } from '../services/geospatialService';

const weather = (overrides: Partial<FieldWeather> = {}): FieldWeather =>
  ({
    fieldId: '1',
    stale: false,
    rain: { forecast24hMm: 0, forecast48hMm: 0 } as FieldWeather['rain'],
    wind: { currentSpeedKmh: 8, currentGustKmh: 11, maxNext24hKmh: 14 } as FieldWeather['wind'],
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
      lowC: 18,
    },
    ...overrides,
  }) as FieldWeather;

describe('presentGroveOutlook', () => {
  it('stays quiet when nothing harsh is coming', () => {
    expect(presentGroveOutlook(weather())).toEqual([]);
  });

  it('does not turn a trace of rain into a problem', () => {
    expect(
      presentGroveOutlook(weather({ rain: { forecast24hMm: 0.4, forecast48hMm: 0.4 } as FieldWeather['rain'] }))
    ).toEqual([]);
  });

  it('lists frost, then later rain only when more is actually coming', () => {
    const items = presentGroveOutlook(
      weather({
        frost: { level: 'High', forecastMinTempC: 1, confidence: 'high' },
        rain: { forecast24hMm: 3, forecast48hMm: 9, forecast72hMm: 9 } as FieldWeather['rain'],
      })
    );
    expect(items.map((i) => i.id)).toEqual(['frost', 'rain24', 'rain48']);
    expect(items[0].window).toBe('tonight');
  });

  it('keeps current stress on the card and merges later rain across groves', () => {
    const dry = presentGroveOutlook(weather({
      waterBalance: { rainMm: 0, et0Mm: 4, irrigationMm: 0, balanceMm: -34, label: '' },
    }));
    expect(dry.some((item) => item.id === 'deficit')).toBe(true);
    expect(mergeGroveOutlook([{ fieldId: 'a', items: dry }])).toEqual([]);

    const merged = mergeGroveOutlook([
      {
        fieldId: 'a',
        items: presentGroveOutlook(
          weather({ rain: { forecast24hMm: 4, forecast48hMm: 4 } as FieldWeather['rain'] })
        ),
      },
      {
        fieldId: 'b',
        items: presentGroveOutlook(
          weather({ rain: { forecast24hMm: 6, forecast48hMm: 6 } as FieldWeather['rain'] })
        ),
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].fieldIds).toEqual(['a', 'b']);
    expect(merged[0].item.params?.mm).toBe('4–6');
  });
});

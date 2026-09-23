import {
  coverageSufficient,
  displayWeatherNumber,
  forecastWeather,
  measuredTotal,
  missingWeather,
  weatherFromMeasured,
} from './weatherValue';

describe('weatherValue', () => {
  it('keeps missing distinct from zero', () => {
    expect(weatherFromMeasured(null).kind).toBe('missing');
    expect(weatherFromMeasured(0).kind).toBe('zero');
    expect(weatherFromMeasured(2.5).kind).toBe('actual');
    expect(displayWeatherNumber(missingWeather(), String)).toBe('—');
    expect(displayWeatherNumber(weatherFromMeasured(0), String)).toBe('0');
  });

  it('never adds forecast or missing values into historical totals', () => {
    const total = measuredTotal([
      weatherFromMeasured(10),
      weatherFromMeasured(null),
      forecastWeather(40),
      weatherFromMeasured(0),
    ]);
    expect(total).toBe(10);
  });

  it('rejects forecast coverage and thin actual coverage', () => {
    expect(
      coverageSufficient({ daysWithData: 9, expectedDays: 30, includesForecast: false })
    ).toBe(false);
    expect(
      coverageSufficient({ daysWithData: 27, expectedDays: 30, includesForecast: true })
    ).toBe(false);
    expect(
      coverageSufficient({ daysWithData: 27, expectedDays: 30, includesForecast: false })
    ).toBe(true);
  });
});

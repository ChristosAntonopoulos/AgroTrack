export type HarvestDayRank = 'good' | 'caution' | 'unsuitable' | 'unknown';

export type HarvestWeekDay = {
  offset: number;
  rank: HarvestDayRank;
  rainMm?: number;
  windKmh?: number;
};

/** Harvest weather thresholds from WeatherSuitabilityEvaluator. */
export const rankHarvestDay = (rainMm?: number, windKmh?: number): HarvestDayRank => {
  if (rainMm == null && windKmh == null) return 'unknown';
  const rain = rainMm ?? 0;
  const wind = windKmh ?? 0;
  if (rain >= 5) return 'unsuitable';
  if (wind >= 45) return 'unsuitable';
  if (rain >= 1 || wind >= 35) return 'caution';
  return 'good';
};

export const buildWeekStrip = (input: {
  rain24?: number;
  rain48?: number;
  rain72?: number;
  wind24?: number;
  wind72?: number;
}): HarvestWeekDay[] => {
  const todayRain = input.rain24;
  const day1Rain =
    input.rain48 != null && input.rain24 != null ? Math.max(0, input.rain48 - input.rain24) : input.rain48;
  const day2Rain =
    input.rain72 != null && input.rain48 != null ? Math.max(0, input.rain72 - input.rain48) : input.rain72;

  return [
    { offset: 0, rank: rankHarvestDay(todayRain, input.wind24), rainMm: todayRain, windKmh: input.wind24 },
    { offset: 1, rank: rankHarvestDay(day1Rain, input.wind24), rainMm: day1Rain, windKmh: input.wind24 },
    {
      offset: 2,
      rank: rankHarvestDay(day2Rain, input.wind72 ?? input.wind24),
      rainMm: day2Rain,
      windKmh: input.wind72,
    },
    { offset: 3, rank: 'unknown' },
    { offset: 4, rank: 'unknown' },
    { offset: 5, rank: 'unknown' },
    { offset: 6, rank: 'unknown' },
  ];
};

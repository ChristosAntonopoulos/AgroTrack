import type { FieldWeather, FrostRiskLevel } from '../services/geospatialService';

export type GroveOutlookWindow = 'now' | 'tonight' | 'h24' | 'h48' | 'h72';

export type GroveOutlookItem = {
  id: string;
  harsh: boolean;
  window: GroveOutlookWindow;
  labelKey: string;
  params?: Record<string, string | number>;
};

const frostWatch = (level?: FrostRiskLevel | string | null) => {
  const value = String(level || '').toLowerCase();
  return value === 'moderate' || value === 'high' || value === 'critical';
};

const mm = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: value >= 10 ? 0 : 1 });

/** Coming risks from data we already have. No invented daily temperatures. */
export const presentGroveOutlook = (field?: FieldWeather | null): GroveOutlookItem[] => {
  if (!field) return [];

  const items: GroveOutlookItem[] = [];
  const frostLevel = field.frost?.level;
  const frostMin = field.frost?.forecastMinTempC ?? field.current?.lowC;
  const high = field.current?.highC;
  const now = field.current?.temperatureC;
  const windSoon = field.wind?.maxNext24hKmh ?? 0;
  const gust = field.wind?.currentGustKmh ?? field.current?.windGustKmh ?? 0;
  const rain24 = field.rain?.forecast24hMm ?? 0;
  const rain48 = field.rain?.forecast48hMm;
  const rain72 = field.rain?.forecast72hMm;
  const deficit = field.waterBalance?.balanceMm;

  if (frostWatch(frostLevel) || (frostMin != null && frostMin <= 2)) {
    items.push({
      id: 'frost',
      harsh: true,
      window: 'tonight',
      labelKey:
        String(frostLevel || '').toLowerCase() === 'critical'
          ? 'problem.frostCritical'
          : frostMin != null
            ? 'problem.frost'
            : 'problem.frostWatch',
      params: frostMin != null ? { temp: Math.round(frostMin) } : undefined,
    });
  }

  if ((high != null && high >= 36) || (now != null && now >= 34)) {
    items.push({
      id: 'heat',
      harsh: true,
      window: 'now',
      labelKey: 'problem.heat',
      params: { temp: Math.round(high ?? now ?? 0) },
    });
  }

  if (rain24 >= 1) {
    items.push({
      id: 'rain24',
      harsh: rain24 >= 8,
      window: 'h24',
      labelKey: 'problem.rain24',
      params: { mm: mm(rain24) },
    });
  }
  if (rain48 != null && rain48 >= Math.max(rain24, 0) + 2 && rain48 >= 1) {
    items.push({
      id: 'rain48',
      harsh: rain48 >= 12,
      window: 'h48',
      labelKey: 'problem.rain48',
      params: { mm: mm(rain48) },
    });
  }
  if (rain72 != null && rain72 >= Math.max(rain48 ?? rain24, 0) + 2 && rain72 >= 1) {
    items.push({
      id: 'rain72',
      harsh: rain72 >= 16,
      window: 'h72',
      labelKey: 'problem.rain72',
      params: { mm: mm(rain72) },
    });
  }

  if (windSoon >= 32 || gust >= 40) {
    items.push({
      id: 'wind',
      harsh: windSoon >= 40 || gust >= 45,
      window: 'h24',
      labelKey: 'problem.wind',
      params: { kmh: Math.round(Math.max(windSoon, gust)) },
    });
  }

  if (deficit != null && deficit <= -15) {
    items.push({
      id: 'deficit',
      harsh: true,
      window: 'now',
      labelKey: 'problem.deficit',
      params: { mm: Math.round(Math.abs(deficit)) },
    });
  }

  return items;
};

export const outlookSignature = (item: GroveOutlookItem) => `${item.id}:${item.window}`;

const rangeParam = (values: number[]) => {
  const nums = values.filter((n) => Number.isFinite(n));
  if (!nums.length) return undefined;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return min === max ? String(min) : `${min}–${max}`;
};

export const mergeGroveOutlook = (
  rows: Array<{ fieldId: string; items: GroveOutlookItem[] }>
): Array<{ item: GroveOutlookItem; fieldIds: string[] }> => {
  const grouped = new Map<string, { item: GroveOutlookItem; fieldIds: string[]; nums: Record<string, number[]> }>();
  for (const row of rows) {
    for (const item of row.items) {
      if (item.window === 'now') continue;
      const key = outlookSignature(item);
      const current = grouped.get(key);
      const nums: Record<string, number[]> = {};
      for (const [name, value] of Object.entries(item.params || {})) {
        const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
        if (Number.isFinite(parsed)) nums[name] = [parsed];
      }
      if (current) {
        current.fieldIds.push(row.fieldId);
        for (const [name, values] of Object.entries(nums)) {
          current.nums[name] = [...(current.nums[name] || []), ...values];
        }
      } else {
        grouped.set(key, { item, fieldIds: [row.fieldId], nums });
      }
    }
  }
  return [...grouped.values()].map(({ item, fieldIds, nums }) => {
    const params = { ...item.params };
    for (const [name, values] of Object.entries(nums)) {
      const ranged = rangeParam(values);
      if (ranged) params[name] = ranged;
    }
    return { item: { ...item, params }, fieldIds };
  });
};

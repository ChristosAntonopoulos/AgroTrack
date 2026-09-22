import { yearFromIsoDate } from './moneyUi';

export type MoneySplitMode = 'single' | 'equal' | 'area';
export type MoneyRepeat = 'once' | 'monthly';

export type MoneySeriesEntry = {
  fieldId: string;
  amount: number;
  occurredOn: string;
  resultYear: number;
  index: number;
  count: number;
};

export type MoneySeriesPlan =
  | { ok: true; entries: MoneySeriesEntry[] }
  | { ok: false; reason: 'need-two' | 'too-many' | 'missing-area' };

const MAX_ENTRIES = 36;

const roundCents = (cents: number) => cents / 100;

/** Split a money total into cent-accurate parts that add back to the total. */
export function allocateCents(total: number, weights: number[]): number[] {
  const count = weights.length;
  if (count === 0) return [];
  const cents = Math.round(total * 100);
  const safeWeights = weights.map((weight) => (Number.isFinite(weight) && weight > 0 ? weight : 0));
  const weightSum = safeWeights.reduce((sum, weight) => sum + weight, 0);
  const useEqual = weightSum <= 0;
  const raw = useEqual
    ? Array.from({ length: count }, () => Math.floor(cents / count))
    : safeWeights.map((weight) => Math.floor((cents * weight) / weightSum));
  let leftover = cents - raw.reduce((sum, value) => sum + value, 0);
  const order = safeWeights
    .map((weight, index) => ({ weight: useEqual ? count - index : weight, index }))
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  const result = [...raw];
  let cursor = 0;
  while (leftover > 0 && order.length > 0) {
    result[order[cursor % order.length].index] += 1;
    leftover -= 1;
    cursor += 1;
  }
  return result.map(roundCents);
}

export function addCalendarMonths(isoDate: string, months: number): string {
  const [yearText, monthText, dayText] = isoDate.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return isoDate;
  const target = month - 1 + months;
  const nextYear = year + Math.floor(target / 12);
  const nextMonth = ((target % 12) + 12) % 12;
  const lastDay = new Date(nextYear, nextMonth + 1, 0).getDate();
  const nextDay = Math.min(day, lastDay);
  return `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
}

/** Dates from the start through the end of the same harvest year, one per month. */
export function monthlyDatesInHarvestYear(startIso: string, resultYear: number): string[] {
  const dates = [startIso];
  for (let step = 1; step < 12; step += 1) {
    const next = addCalendarMonths(startIso, step);
    if (yearFromIsoDate(next) !== resultYear) break;
    dates.push(next);
  }
  return dates;
}

export function planMoneySeries(input: {
  amount: number;
  occurredOn: string;
  resultYear: number;
  fieldIds: string[];
  areaHectares: Record<string, number | null | undefined>;
  splitMode: MoneySplitMode;
  repeat: MoneyRepeat;
}): MoneySeriesPlan {
  const fieldIds = input.splitMode === 'single' ? input.fieldIds.slice(0, 1) : [...new Set(input.fieldIds.filter(Boolean))];
  if (input.splitMode !== 'single' && fieldIds.length < 2) {
    return { ok: false, reason: 'need-two' };
  }

  let shares = fieldIds.length ? fieldIds : [''];
  if (input.splitMode === 'area') {
    const withArea = shares.filter((id) => (input.areaHectares[id] ?? 0) > 0);
    if (withArea.length < 2) return { ok: false, reason: 'missing-area' };
    shares = withArea;
  }

  const weights =
    input.splitMode === 'area'
      ? shares.map((id) => input.areaHectares[id] || 0)
      : shares.map(() => 1);
  const amounts = input.splitMode === 'single' ? [Math.round(input.amount * 100) / 100] : allocateCents(input.amount, weights);
  const dates =
    input.repeat === 'monthly'
      ? monthlyDatesInHarvestYear(input.occurredOn, input.resultYear)
      : [input.occurredOn];

  const entries: MoneySeriesEntry[] = [];
  dates.forEach((occurredOn) => {
    shares.forEach((fieldId, index) => {
      entries.push({
        fieldId,
        amount: amounts[index] ?? 0,
        occurredOn,
        resultYear: input.repeat === 'monthly' ? yearFromIsoDate(occurredOn) : input.resultYear,
        index: entries.length + 1,
        count: 0,
      });
    });
  });
  const stamped = entries.map((entry) => ({ ...entry, count: entries.length }));
  if (stamped.length > MAX_ENTRIES) return { ok: false, reason: 'too-many' };
  if (stamped.some((entry) => entry.amount <= 0)) return { ok: false, reason: 'too-many' };
  return { ok: true, entries: stamped };
}

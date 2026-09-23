import type { ChronologioEntry } from '../services/chronologioService';
import { groupChronologioEntries } from './chronologioGrouping';
import { groupSameDayPhotoEntries } from './chronologioPhotoGroups';

export type TimelineRowKind = 'year' | 'month' | 'day' | 'entry' | 'weatherCluster' | 'photoGroup';

export type ChronologioTimelineRow = {
  key: string;
  kind: TimelineRowKind;
  stickyLabel: string;
  year: number;
  month: number;
  label?: string;
  /** Secondary line under day heading e.g. "Fri, 11 September" */
  sublabel?: string;
  dayKind?: 'today' | 'yesterday' | 'day';
  dateKey?: string;
  entry?: ChronologioEntry;
  /** Month weather reviews for the field-pick cluster (same card family). */
  weatherReviews?: ChronologioEntry[];
  /** Same-day Photo Hub entries collapsed into one collage card. */
  photoEntries?: ChronologioEntry[];
};

type BuildOptions = {
  todayLabel: string;
  yesterdayLabel: string;
  locale: string;
  skipEntry?: (e: ChronologioEntry) => boolean;
};

/**
 * Newest-first timeline: progressive year / month headers + day groups + entries.
 * No floating "Now" — Today is a quiet day heading with a date subline.
 */
export const buildChronologioTimelineRows = (
  entries: ChronologioEntry[],
  options: BuildOptions,
  now: Date = new Date()
): ChronologioTimelineRow[] => {
  const model = groupChronologioEntries(entries, now);
  const rows: ChronologioTimelineRow[] = [];
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const skip = options.skipEntry ?? (() => false);

  let lastYear: number | null = null;
  let lastMonthKey: string | null = null;

  for (const m of model.months) {
    for (const d of m.days) {
      const dayEntries = d.entries.filter((e) => !skip(e));
      if (dayEntries.length === 0) continue;

      const year = d.date.getFullYear();
      const month = d.date.getMonth() + 1;
      const monthKey = `${year}-${month}`;

      if (lastYear !== null && year !== lastYear) {
        rows.push({
          key: `y-${year}`,
          kind: 'year',
          stickyLabel: String(year),
          year,
          month,
          label: String(year),
        });
      } else if (lastYear === null && year !== currentYear) {
        rows.push({
          key: `y-${year}`,
          kind: 'year',
          stickyLabel: String(year),
          year,
          month,
          label: String(year),
        });
      }

      if (lastMonthKey !== monthKey) {
        const isOpeningCurrentMonth =
          lastMonthKey === null && year === currentYear && month === currentMonth;
        if (!isOpeningCurrentMonth) {
          const monthLabel = d.date.toLocaleDateString(options.locale, {
            month: 'long',
            year: year !== currentYear ? 'numeric' : undefined,
          });
          rows.push({
            key: `m-${monthKey}`,
            kind: 'month',
            stickyLabel: monthLabel,
            year,
            month,
            label: monthLabel,
          });
        }
        lastMonthKey = monthKey;
      }

      lastYear = year;

      const fullDate = d.date.toLocaleDateString(options.locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: year !== currentYear ? 'numeric' : undefined,
      });

      const dayLabel =
        d.kind === 'today'
          ? options.todayLabel
          : d.kind === 'yesterday'
            ? options.yesterdayLabel
            : d.date.toLocaleDateString(options.locale, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: year !== currentYear ? 'numeric' : undefined,
              });

      const sublabel =
        d.kind === 'today' || d.kind === 'yesterday' ? fullDate : undefined;

      rows.push({
        key: `d-${d.key}`,
        kind: 'day',
        stickyLabel: dayLabel,
        year,
        month,
        label: dayLabel,
        sublabel,
        dayKind: d.kind,
        dateKey: d.key,
      });

      const monthReviews = dayEntries.filter((e) => e.eventType === 'weather.monthReview');
      const otherEntries = dayEntries.filter((e) => e.eventType !== 'weather.monthReview');

      if (monthReviews.length > 0) {
        rows.push({
          key: `wx-${d.key}`,
          kind: 'weatherCluster',
          stickyLabel: dayLabel,
          year,
          month,
          dayKind: d.kind,
          weatherReviews: monthReviews,
        });
      }

      for (const item of groupSameDayPhotoEntries(otherEntries)) {
        if (item.type === 'photoGroup') {
          rows.push({
            key: item.id,
            kind: 'photoGroup',
            stickyLabel: dayLabel,
            year,
            month,
            dayKind: d.kind,
            photoEntries: item.entries,
          });
        } else {
          rows.push({
            key: item.entry.id,
            kind: 'entry',
            stickyLabel: dayLabel,
            year,
            month,
            dayKind: d.kind,
            entry: item.entry,
          });
        }
      }
    }
  }

  return rows;
};

export { PAGE_SIZE } from './chronologioGrouping';

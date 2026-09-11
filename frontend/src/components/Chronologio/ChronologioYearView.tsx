import React, { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import type {
  ChronologioAxis,
  ChronologioEntry,
  ChronologioMonthSummary,
  ChronologioWeatherDetails,
} from '../../services/chronologioService';
import {
  agriculturalYearFor,
  agriculturalYearRangeLabel,
} from '../../chronologio/agriculturalYear';
import {
  harvestHasResult,
  monthHasActivity,
  monthsForOverview,
} from '../../chronologio/monthPresentation';
import {
  monthSeasonStage,
  seasonStageIndex,
  type SeasonStage,
} from '../../chronologio/yearPresentation';
import type { SupportedLocale } from '../../i18n/config';
import ChronologioSeasonTrack from './ChronologioSeasonTrack';
import ChronologioMonthSection from './ChronologioMonthSection';

type Props = {
  periodYear: number;
  axis: ChronologioAxis;
  months: ChronologioMonthSummary[];
  entries?: ChronologioEntry[];
  weatherReviews?: ChronologioEntry[];
  focusMonth: number;
  focusMonthYear: number;
  numberLocale: string;
  locale: SupportedLocale;
  weatherByMonth?: Record<string, ChronologioWeatherDetails>;
  fieldId?: string;
  showField?: boolean;
  selectedEntryId?: string | null;
  onPeekMonth: (year: number, month: number) => void;
  onOpenMonthDays: (year: number, month: number) => void;
  onPeekMonthWeather: (year: number, month: number) => void;
  onSelect?: (entry: ChronologioEntry) => void;
};

const monthWeatherKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, '0')}`;

const isMonthReview = (entry: ChronologioEntry) =>
  entry.eventType === 'weather.monthReview' || entry.eventType === 'weather.yearReview';

const entryMonthKey = (entry: ChronologioEntry) => {
  const y = entry.details.weather?.year;
  const m = entry.details.weather?.month;
  if (entry.eventType === 'weather.monthReview' && y != null && m != null) {
    return monthWeatherKey(y, m);
  }
  const d = new Date(entry.occurredAt);
  return monthWeatherKey(d.getFullYear(), d.getMonth() + 1);
};

type FlatRow =
  | { kind: 'season'; key: string; stage: SeasonStage }
  | {
      kind: 'month';
      key: string;
      month: ChronologioMonthSummary;
      reviews: ChronologioEntry[];
      entries: ChronologioEntry[];
    };

const ChronologioYearView: React.FC<Props> = ({
  periodYear,
  axis,
  months,
  entries = [],
  weatherReviews = [],
  focusMonth,
  focusMonthYear,
  numberLocale,
  locale,
  weatherByMonth,
  fieldId,
  showField = false,
  selectedEntryId,
  onPeekMonth,
  onOpenMonthDays,
  onPeekMonthWeather,
  onSelect,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const parentRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const nowMonth = now.getMonth() + 1;
  const nowYear = now.getFullYear();
  const orderedMonths = useMemo(
    () => monthsForOverview(months, periodYear, axis, { year: nowYear, month: nowMonth }),
    [axis, months, nowMonth, nowYear, periodYear]
  );
  const reviewsByMonth = useMemo(() => {
    const map: Record<string, ChronologioEntry[]> = {};
    for (const row of weatherReviews) {
      const key = entryMonthKey(row);
      (map[key] ||= []).push(row);
    }
    return map;
  }, [weatherReviews]);
  const entriesByMonth = useMemo(() => {
    const map: Record<string, ChronologioEntry[]> = {};
    for (const row of entries) {
      if (isMonthReview(row)) continue;
      const key = entryMonthKey(row);
      (map[key] ||= []).push(row);
    }
    return map;
  }, [entries]);

  const rows = useMemo(() => {
    const flat: FlatRow[] = [];
    let lastStage: SeasonStage | null = null;
    for (const month of orderedMonths) {
      const stage = monthSeasonStage(month.month);
      if (stage !== lastStage) {
        flat.push({ kind: 'season', key: `s-${stage}-${month.key}`, stage });
        lastStage = stage;
      }
      flat.push({
        kind: 'month',
        key: `m-${month.key}`,
        month,
        reviews: reviewsByMonth[monthWeatherKey(month.year, month.month)] || [],
        entries: entriesByMonth[monthWeatherKey(month.year, month.month)] || [],
      });
    }
    return flat;
  }, [entriesByMonth, orderedMonths, reviewsByMonth]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    getItemKey: (i) => rows[i]?.key ?? i,
    estimateSize: (i) => {
      const row = rows[i];
      if (!row) return 168;
      if (row.kind === 'season') return 48;
      const picks = showField ? row.reviews.length : 0;
      const cards = row.entries.length || 2;
      const empty = !monthHasActivity(row.month) && row.entries.length === 0 && row.reviews.length === 0;
      if (empty) return 96;
      return 108 + (picks > 1 ? 176 : 0) + Math.ceil(Math.max(1, cards) / 2) * 156;
    },
    overscan: 6,
    paddingEnd: 32,
  });

  const live = axis === 'agricultural' && periodYear === agriculturalYearFor(now);
  const oilKg = months.reduce((sum, month) => sum + month.oilKg, 0);
  const oliveKg = months.reduce((sum, month) => sum + month.oliveKg, 0);
  const range = axis === 'agricultural' ? agriculturalYearRangeLabel(periodYear, i18n.language) : '';
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="chrono-year-view chrono-year-feed chrono-journal-view chrono-day-timeline">
      <header className="chrono-year-hero">
        <p className="chrono-year-hero-kicker">
          {live ? t('yearView.liveYear') : t('yearView.closedYear')}
        </p>
        <h2 className="chrono-year-view-title">{periodYear}</h2>
        {range ? <p className="chrono-year-range">{range}</p> : null}
        {live ? (
          <ChronologioSeasonTrack currentIndex={seasonStageIndex(now)} />
        ) : harvestHasResult({ oliveKg, oilKg }) ? (
          <p className="chrono-year-oil-hero">
            {oilKg > 0
              ? `${oilKg.toLocaleString(numberLocale, { maximumFractionDigits: 1 })} ${t('oilUnit')}`
              : `${Math.round(oliveKg).toLocaleString(numberLocale)} ${t('olivesUnit')}`}
          </p>
        ) : null}
      </header>

      <div ref={parentRef} className="chrono-month-scroll chrono-journal-scroll">
        <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
          {virtualItems.map((vRow) => {
            const row = rows[vRow.index];
            return (
              <div
                key={row.key}
                className="chrono-month-virtual-row"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${vRow.start}px)`,
                }}
                ref={virtualizer.measureElement}
                data-index={vRow.index}
              >
                {row.kind === 'season' ? (
                  <p className="chrono-year-season-mark">{t(`yearView.stages.${row.stage}`)}</p>
                ) : (
                  <ChronologioMonthSection
                    month={row.month}
                    weather={
                      row.reviews[0]?.details.weather ||
                      weatherByMonth?.[monthWeatherKey(row.month.year, row.month.month)]
                    }
                    weatherReviews={row.reviews}
                    entries={row.entries}
                    numberLocale={numberLocale}
                    locale={locale}
                    fieldId={fieldId}
                    showField={showField}
                    selectedEntryId={selectedEntryId}
                    active={row.month.month === focusMonth && row.month.year === focusMonthYear}
                    isCurrent={row.month.month === nowMonth && row.month.year === nowYear}
                    empty={
                      !monthHasActivity(row.month) &&
                      row.entries.length === 0 &&
                      row.reviews.length === 0
                    }
                    onOpenMonth={() => onPeekMonth(row.month.year, row.month.month)}
                    onOpenDays={() => onOpenMonthDays(row.month.year, row.month.month)}
                    onSelect={onSelect}
                    onPeekWeather={() => onPeekMonthWeather(row.month.year, row.month.month)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChronologioYearView;

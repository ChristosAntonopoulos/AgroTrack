import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  type MonthChapterFocus,
} from '../../chronologio/monthPresentation';
import { formatGroveMassKg } from '../../utils/groveTotals';
import { monthFocusKey, type MonthRailItem } from '../../chronologio/timelineRail';
import { useReadingMonthKey } from '../../chronologio/useReadingMonthKey';
import { formatMonthHeading } from '../../utils/taskFormDates';
import ChronologioTimelineFrame from './ChronologioTimelineFrame';
import {
  monthSeasonStage,
  seasonStageIndex,
  type SeasonStage,
} from '../../chronologio/yearPresentation';
import {
  chronologioScrollKey,
  readChronologioJournalScroll,
  saveChronologioJournalScroll,
} from '../../chronologio/chronologioViewState';
import type { ChronologioZoom } from '../../chronologio/livingTypes';
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
  /** All in-scope grove names (for missing-weather callouts). */
  groveNames?: { id: string; name: string }[];
  selectedEntryId?: string | null;
  focusDate?: string;
  zoom?: ChronologioZoom;
  onPeekMonth: (year: number, month: number, focus?: MonthChapterFocus) => void;
  onOpenMonthDays: (year: number, month: number) => void;
  onPeekMonthWeather: (year: number, month: number) => void;
  onSelect?: (entry: ChronologioEntry) => void;
  onClearSelection?: () => void;
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
  groveNames = [],
  selectedEntryId,
  focusDate = '',
  zoom = 'year',
  onPeekMonth,
  onOpenMonthDays,
  onPeekMonthWeather,
  onSelect,
  onClearSelection,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const restoredScrollKey = useRef<string | null>(null);
  const scrollStorageKey = chronologioScrollKey({ zoom, focusDate, fieldId });
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

  const live = axis === 'agricultural' && periodYear === agriculturalYearFor(now);
  const oilKg = months.reduce((sum, month) => sum + month.oilKg, 0);
  const oliveKg = months.reduce((sum, month) => sum + month.oliveKg, 0);
  const range = axis === 'agricultural' ? agriculturalYearRangeLabel(periodYear, i18n.language) : '';
  const monthMarks: MonthRailItem[] = useMemo(
    () => orderedMonths.map((month) => ({ key: `${month.year}-${month.month}`, year: month.year, month: month.month })),
    [orderedMonths]
  );
  const readingKey = useReadingMonthKey(scrollStorageKey);
  const activeMonth =
    orderedMonths.find((month) => `${month.year}-${month.month}` === readingKey) || orderedMonths[0];
  const activeFocus = activeMonth
    ? monthFocusKey({
        harvest: activeMonth.harvestCount,
        work: activeMonth.taskCount,
        observation: activeMonth.noteCount,
        money: activeMonth.expenseCount,
      })
    : null;
  const readingLabel = activeMonth
    ? activeFocus
      ? `${formatMonthHeading(activeMonth.year, activeMonth.month, i18n.language)} · ${t(`primaryCategories.${activeFocus}`)}`
      : formatMonthHeading(activeMonth.year, activeMonth.month, i18n.language)
    : '';

  useLayoutEffect(() => {
    if (rows.length === 0 || restoredScrollKey.current === scrollStorageKey) return;
    restoredScrollKey.current = scrollStorageKey;
    const saved = readChronologioJournalScroll(scrollStorageKey);
    window.scrollTo({ top: saved ?? 0, left: 0, behavior: 'auto' });
  }, [rows.length, scrollStorageKey]);

  useEffect(() => {
    const onScroll = () => saveChronologioJournalScroll(scrollStorageKey, window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      saveChronologioJournalScroll(scrollStorageKey, window.scrollY);
      window.removeEventListener('scroll', onScroll);
    };
  }, [scrollStorageKey]);

  const jumpToMonth = (month: MonthRailItem) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(`chrono-chapter-${month.year}-${month.month}`)?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="chrono-year-view chrono-year-feed chrono-journal-view chrono-day-timeline">
      <header className="chrono-year-hero">
        <p className="chrono-year-hero-kicker">
          {live ? t('yearView.liveYearSoFar') : t('yearView.closedYear')}
        </p>
        {axis === 'agricultural' ? (
          <p className="chrono-control-hint">{t('dateControl.agriYearOpens')}</p>
        ) : null}
        <h2 className="chrono-year-view-title">{periodYear}</h2>
        {range ? <p className="chrono-year-range">{range}</p> : null}
        {live ? (
          <ChronologioSeasonTrack currentIndex={seasonStageIndex(now)} />
        ) : harvestHasResult({ oliveKg, oilKg }) ? (
          <p className="chrono-year-oil-hero">
            {oilKg > 0
              ? `${formatGroveMassKg(oilKg, numberLocale)} ${t('oilUnit')}`
              : `${formatGroveMassKg(oliveKg, numberLocale)} ${t('olivesUnit')}`}
          </p>
        ) : null}
      </header>

      <ChronologioTimelineFrame
        label={readingLabel}
        labelKey={activeMonth ? `${activeMonth.year}-${activeMonth.month}` : 'none'}
        months={monthMarks}
        activeKey={activeMonth ? `${activeMonth.year}-${activeMonth.month}` : null}
        onJump={jumpToMonth}
      >
        <div className="chrono-month-chapters">
          {rows.map((row) =>
            row.kind === 'season' ? (
              <p key={row.key} className="chrono-year-season-mark">
                {t(`yearView.stages.${row.stage}`)}
              </p>
            ) : (
              <ChronologioMonthSection
                key={row.key}
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
                missingWeatherFields={
                  showField && groveNames.length > 0
                    ? groveNames
                        .filter(
                          (g) =>
                            !row.reviews.some((r) => r.fieldId === g.id || r.field?.id === g.id)
                        )
                        .map((g) => g.name)
                    : []
                }
                selectedEntryId={selectedEntryId}
                active={row.month.month === focusMonth && row.month.year === focusMonthYear}
                isCurrent={row.month.month === nowMonth && row.month.year === nowYear}
                empty={
                  !monthHasActivity(row.month) &&
                  row.entries.length === 0 &&
                  row.reviews.length === 0
                }
                onOpenMonth={(focus) => onPeekMonth(row.month.year, row.month.month, focus)}
                onOpenDays={() => onOpenMonthDays(row.month.year, row.month.month)}
                onSelect={onSelect}
                onClearSelection={onClearSelection}
                onPeekWeather={() => onPeekMonthWeather(row.month.year, row.month.month)}
              />
            )
          )}
        </div>
      </ChronologioTimelineFrame>
    </div>
  );
};

export default ChronologioYearView;

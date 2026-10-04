import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Circle, Euro, Wheat } from 'lucide-react';
import type {
  ChronologioAxis,
  ChronologioEntry,
  ChronologioMonthSummary,
  ChronologioWeatherDetails,
} from '../../services/chronologioService';
import {
  agriculturalYearRangeLabel,
  agriculturalYearSlashLabel,
} from '../../chronologio/agriculturalYear';
import { monthsForOverview, type MonthChapterFocus } from '../../chronologio/monthPresentation';
import { formatGroveMassKg } from '../../utils/groveTotals';
import { periodEventCount } from '../../chronologio/summaryFacts';
import type { MonthRailItem } from '../../chronologio/timelineRail';
import { useReadingMonthKey } from '../../chronologio/useReadingMonthKey';
import ChronologioTimelineFrame from './ChronologioTimelineFrame';
import { monthSeasonStage, type SeasonStage } from '../../chronologio/yearPresentation';
import {
  chronologioScrollKey,
  readChronologioJournalScroll,
  saveChronologioJournalScroll,
} from '../../chronologio/chronologioViewState';
import type { ChronologioZoom } from '../../chronologio/livingTypes';
import type { SupportedLocale } from '../../i18n/config';
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
      kind: 'harvest';
      key: string;
      year: number;
      fromLabel: string;
      toLabel: string;
      oliveKg: number;
      oilKg: number;
      days: number;
    }
  | {
      kind: 'month';
      key: string;
      month: ChronologioMonthSummary;
      reviews: ChronologioEntry[];
      entries: ChronologioEntry[];
    };

const monthIsMemorable = (month: ChronologioMonthSummary, entries: ChronologioEntry[]) =>
  periodEventCount(month) > 0 ||
  month.harvestCount > 0 ||
  month.oliveKg > 0 ||
  month.oilKg > 0 ||
  (month.frostNights ?? 0) > 0 ||
  (month.heatDays ?? 0) > 0 ||
  entries.some((entry) => (entry.media?.length || 0) > 0);

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
    let harvestPlaced = false;
    const harvestMonths = orderedMonths.filter(
      (month) => month.harvestCount > 0 || month.oliveKg > 0 || month.oilKg > 0
    );
    for (let index = 0; index < orderedMonths.length; index += 1) {
      const month = orderedMonths[index];
      const stage = monthSeasonStage(month.month);
      if (stage !== lastStage) {
        lastStage = stage;
        if (stage !== 'harvest') {
          let end = index;
          while (
            end < orderedMonths.length &&
            monthSeasonStage(orderedMonths[end].month) === stage
          ) {
            end += 1;
          }
          const stageHasMemory = orderedMonths.slice(index, end).some((row) =>
            monthIsMemorable(row, entriesByMonth[monthWeatherKey(row.year, row.month)] || [])
          );
          if (stageHasMemory) {
            flat.push({ kind: 'season', key: `s-${stage}-${month.key}`, stage });
          }
        }
      }
      if (!harvestPlaced && harvestMonths.some((row) => row.key === month.key)) {
        harvestPlaced = true;
        const chronological = [...harvestMonths].sort((a, b) =>
          a.year !== b.year ? a.year - b.year : a.month - b.month
        );
        const earliest = chronological[0];
        const latest = chronological[chronological.length - 1];
        flat.push({
          kind: 'harvest',
          key: `harvest-${periodYear}`,
          year: periodYear,
          fromLabel: new Date(earliest.year, earliest.month - 1, 1).toLocaleDateString(i18n.language, {
            day: 'numeric',
            month: 'short',
          }),
          toLabel: new Date(latest.year, latest.month, 0).toLocaleDateString(i18n.language, {
            day: 'numeric',
            month: 'short',
          }),
          oliveKg: harvestMonths.reduce((sum, row) => sum + row.oliveKg, 0),
          oilKg: harvestMonths.reduce((sum, row) => sum + row.oilKg, 0),
          days: harvestMonths.reduce((sum, row) => sum + row.harvestCount, 0),
        });
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
  }, [entriesByMonth, i18n.language, orderedMonths, periodYear, reviewsByMonth]);

  const range = axis === 'agricultural' ? agriculturalYearRangeLabel(periodYear, i18n.language) : '';
  const seasonTitle =
    axis === 'agricultural' ? agriculturalYearSlashLabel(periodYear).replace('/', '–') : String(periodYear);
  const recordTotal = orderedMonths.reduce((sum, month) => sum + periodEventCount(month), 0);
  const taskTotal = orderedMonths.reduce((sum, month) => sum + month.taskCount, 0);
  const noteTotal = orderedMonths.reduce((sum, month) => sum + month.noteCount, 0);
  const expenseTotal = orderedMonths.reduce((sum, month) => sum + month.expenseCount, 0);
  const harvestTotal = orderedMonths.reduce((sum, month) => sum + month.harvestCount, 0);
  const groveTotal = new Set(
    entries.map((entry) => entry.fieldId).filter(Boolean)
  ).size || groveNames.length;
  const monthMarks: MonthRailItem[] = useMemo(
    () => orderedMonths.map((month) => ({ key: `${month.year}-${month.month}`, year: month.year, month: month.month })),
    [orderedMonths]
  );
  const railCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const month of orderedMonths) map[`${month.year}-${month.month}`] = periodEventCount(month);
    return map;
  }, [orderedMonths]);
  const railActivity = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const month of orderedMonths) {
      map[`${month.year}-${month.month}`] = monthIsMemorable(
        month,
        entriesByMonth[monthWeatherKey(month.year, month.month)] || []
      );
    }
    return map;
  }, [entriesByMonth, orderedMonths]);
  const readingKey = useReadingMonthKey(scrollStorageKey);
  const activeMonth =
    orderedMonths.find((month) => `${month.year}-${month.month}` === readingKey) || orderedMonths[0];

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
      <header className="chrono-season-hero">
        <h2>{seasonTitle}</h2>
        {range ? <p className="chrono-season-range">{range}</p> : null}
        <p className="chrono-season-meta">
          {[
            t('monthView.monthSpan', { count: orderedMonths.length }),
            recordTotal > 0 ? t('timeline.entryCount', { count: recordTotal }) : null,
            groveTotal > 1 ? `${groveTotal} ${t('weatherPeek.fields').toLocaleLowerCase(i18n.language)}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {taskTotal + noteTotal + expenseTotal + harvestTotal > 0 ? (
          <ul className="chrono-season-facts">
            {taskTotal > 0 ? (
              <li>
                <Check size={14} aria-hidden />
                {t('monthView.workShort', { count: taskTotal })}
              </li>
            ) : null}
            {noteTotal > 0 ? (
              <li>
                <Circle size={12} aria-hidden />
                {t('monthView.notesShort', { count: noteTotal })}
              </li>
            ) : null}
            {expenseTotal > 0 ? (
              <li>
                <Euro size={14} aria-hidden />
                {t('monthView.moneyCount', { count: expenseTotal })}
              </li>
            ) : null}
            {harvestTotal > 0 ? (
              <li className="is-harvest">
                <Wheat size={14} aria-hidden />
                {t('monthView.harvestCount', { count: harvestTotal })}
              </li>
            ) : null}
          </ul>
        ) : null}
      </header>

      <ChronologioTimelineFrame
        label=""
        labelKey={activeMonth ? `${activeMonth.year}-${activeMonth.month}` : 'none'}
        months={monthMarks}
        activeKey={activeMonth ? `${activeMonth.year}-${activeMonth.month}` : null}
        counts={railCounts}
        activity={railActivity}
        fullYear
        onJump={jumpToMonth}
      >
        <div className="chrono-month-chapters">
          {rows.map((row) =>
            row.kind === 'season' ? (
              <p key={row.key} className="chrono-year-season-mark">
                {t(`yearView.stages.${row.stage}`)}
              </p>
            ) : row.kind === 'harvest' ? (
              <section key={row.key} className="chrono-harvest-chapter">
                <p className="chrono-harvest-kicker">{t('monthView.harvestChapter', { year: row.year })}</p>
                <p className="chrono-harvest-span">
                  {row.fromLabel} – {row.toLabel}
                </p>
                <ul>
                  {row.oliveKg > 0 ? (
                    <li>
                      <strong>{formatGroveMassKg(row.oliveKg, numberLocale)}</strong>
                      {t('olivesUnit')}
                    </li>
                  ) : null}
                  {row.oilKg > 0 ? (
                    <li>
                      <strong>{formatGroveMassKg(row.oilKg, numberLocale)}</strong>
                      {t('oilUnit')}
                    </li>
                  ) : null}
                  {row.days > 0 ? (
                    <li>
                      <strong>{row.days}</strong>
                      {t('monthView.harvest')}
                    </li>
                  ) : null}
                </ul>
              </section>
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
                empty={!monthIsMemorable(row.month, row.entries)}
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

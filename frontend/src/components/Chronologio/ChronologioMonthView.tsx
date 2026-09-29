import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import type { ChronologioEntry, ChronologioPeriodSummary } from '../../services/chronologioService';
import { groupChronologioEntries } from '../../utils/chronologioGrouping';
import { groupSameDayPhotoEntries } from '../../utils/chronologioPhotoGroups';
import { agriculturalYearFor, agriculturalYearSlashLabel } from '../../chronologio/agriculturalYear';
import {
  buildDayWeatherView,
  dayWeatherDateKey,
  type DayWeatherInput,
} from '../../chronologio/dayWeather';
import { eventCardSpan } from '../../chronologio/eventCardLayout';
import {
  isCompletedTaskEntry,
  monthFocusKey,
  type MonthFocus,
  type MonthRailItem,
} from '../../chronologio/timelineRail';
import { periodEventCount } from '../../chronologio/summaryFacts';
import { useReadingMonthKey } from '../../chronologio/useReadingMonthKey';
import { isWeatherExtremeEventType } from '../../chronologio/weatherExtreme';
import {
  chronologioScrollKey,
  readChronologioJournalScroll,
  saveChronologioJournalScroll,
} from '../../chronologio/chronologioViewState';
import type { ChronologioZoom } from '../../chronologio/livingTypes';
import ChronologioEvent from './ChronologioEvent';
import ChronologioExtremeBanner from './ChronologioExtremeBanner';
import ChronologioGlanceFacts from './ChronologioGlanceFacts';
import ChronologioPhotoStackCard from './ChronologioPhotoStackCard';
import ChronologioPhotoDaySheet from './ChronologioPhotoDaySheet';
import ChronologioTimelineFrame from './ChronologioTimelineFrame';
import DailyWeatherStrip from './DailyWeatherStrip';
import type { SupportedLocale } from '../../i18n/config';

type Props = {
  entries: ChronologioEntry[];
  showField: boolean;
  locale: SupportedLocale;
  selectedEntryId?: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  hiddenEntryIds?: ReadonlySet<string>;
  weatherByDate?: Record<string, DayWeatherInput>;
  todayWeather?: DayWeatherInput | null;
  focusDate?: string;
  zoom?: ChronologioZoom;
  fieldId?: string;
  /** Agricultural-year totals for the chapter that opens an older season. */
  yearGlances?: ChronologioPeriodSummary[];
  onLoadMore: () => void;
  onSelect: (entry: ChronologioEntry) => void;
  /** Clear the Chronologio side peek so photo day can own the same drawer. */
  onClearSelection?: () => void;
  onOpenWeather?: (year: number, month: number, dateKey: string) => void;
};

type MonthStats = {
  records: number;
  tasksCompleted: number;
  harvest: number;
  work: number;
  observation: number;
  money: number;
};

type DayRow = {
  kind: 'day';
  key: string;
  dateKey: string;
  label: string;
  agriYear: number;
  year: number;
  month: number;
  entries: ChronologioEntry[];
  monthReviews: ChronologioEntry[];
};

type FlatRow =
  | DayRow
  | { kind: 'gap'; key: string; months: number }
  | {
      kind: 'monthSummary';
      key: string;
      year: number;
      month: number;
      label: string;
      records: number;
      tasksCompleted: number;
      focus: MonthFocus | null;
    }
  | {
      kind: 'yearBreak';
      key: string;
      agriYear: number;
      slash: string;
      oilKg: number;
      oliveKg: number;
      expenseTotal: number;
      currency: string;
      recordCount: number;
    }
  | { kind: 'status'; key: string; label: string };

const daysBetween = (newer: Date, older: Date) =>
  Math.round(Math.abs(newer.getTime() - older.getTime()) / 86_400_000);

const isYearWeatherReview = (entry: ChronologioEntry) => entry.eventType === 'weather.yearReview';
const isMonthWeatherReview = (entry: ChronologioEntry) => entry.eventType === 'weather.monthReview';

/** Weather stays on the day line. It does not take a card beside the record. */
const isTimelineWeather = (entry: ChronologioEntry) =>
  entry.category === 'weather' ||
  isMonthWeatherReview(entry) ||
  isYearWeatherReview(entry) ||
  isWeatherExtremeEventType(entry.eventType);

const emptyStats = (): MonthStats => ({
  records: 0,
  tasksCompleted: 0,
  harvest: 0,
  work: 0,
  observation: 0,
  money: 0,
});

const noteFocus = (stats: MonthStats, entry: ChronologioEntry) => {
  if (isTimelineWeather(entry)) return;
  if (entry.category === 'harvest') stats.harvest += 1;
  else if (entry.category === 'task') stats.work += 1;
  else if (entry.category === 'note' || entry.category === 'photo') stats.observation += 1;
  else if (entry.category === 'expense' || entry.category === 'income') stats.money += 1;
};

const ChronologioMonthView: React.FC<Props> = ({
  entries,
  showField,
  locale,
  selectedEntryId,
  hasMore,
  loadingMore,
  hiddenEntryIds,
  weatherByDate,
  todayWeather,
  focusDate = '',
  zoom = 'month',
  fieldId,
  yearGlances = [],
  onLoadMore,
  onSelect,
  onClearSelection,
  onOpenWeather,
}) => {
  const { t, i18n } = useTranslation(['chronologio', 'today']);
  const listRef = useRef<HTMLDivElement>(null);
  const restoredScrollKey = useRef<string | null>(null);
  const [photoDayEntries, setPhotoDayEntries] = useState<ChronologioEntry[] | null>(null);
  const [activeDayKey, setActiveDayKey] = useState<string | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const jumpedFocusRef = useRef<string | null>(null);
  const scrollStorageKey = chronologioScrollKey({ zoom, focusDate, fieldId });
  const readingKey = useReadingMonthKey(scrollStorageKey);
  const todayKey = dayWeatherDateKey(new Date());
  const numberLocale = i18n.language?.startsWith('el')
    ? 'el-GR'
    : i18n.language?.startsWith('it')
      ? 'it-IT'
      : 'en-US';
  const weatherFor = (dateKey: string): DayWeatherInput | null => {
    if (dateKey === todayKey && todayWeather) return todayWeather;
    return weatherByDate?.[dateKey] ?? null;
  };

  const selectEntry = (entry: ChronologioEntry) => {
    setPhotoDayEntries(null);
    onSelect(entry);
  };

  const openPhotoDay = (dayEntries: ChronologioEntry[]) => {
    onClearSelection?.();
    setPhotoDayEntries(dayEntries);
  };

  const rows = useMemo(() => {
    const model = groupChronologioEntries(entries);
    const days: DayRow[] = [];
    const monthStats = new Map<string, MonthStats>();
    for (const month of model.months) {
      for (const day of month.days) {
        const visible = day.entries.filter(
          (entry) => !isYearWeatherReview(entry) && !hiddenEntryIds?.has(entry.id)
        );
        if (visible.length === 0) continue;
        const monthReviews = showField ? visible.filter(isMonthWeatherReview) : [];
        const rest = showField ? visible.filter((entry) => !isMonthWeatherReview(entry)) : visible;
        const agriYear = agriculturalYearFor(day.date);
        const year = day.date.getFullYear();
        const monthNumber = day.date.getMonth() + 1;
        const statsKey = `${year}-${monthNumber}`;
        const stats = monthStats.get(statsKey) ?? emptyStats();
        for (const entry of visible) {
          if (!isTimelineWeather(entry)) stats.records += 1;
          if (isCompletedTaskEntry(entry)) stats.tasksCompleted += 1;
          noteFocus(stats, entry);
        }
        monthStats.set(statsKey, stats);
        days.push({
          kind: 'day',
          key: `d-${day.key}`,
          dateKey: day.key,
          label: day.date.toLocaleDateString(i18n.language, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          agriYear,
          year,
          month: monthNumber,
          entries: rest,
          monthReviews,
        });
      }
    }

    const glanceFor = (agriYear: number) => {
      const summary = yearGlances.find((row) => row.periodYear === agriYear);
      if (summary) {
        return {
          oilKg: summary.oilKg,
          oliveKg: summary.oliveKg,
          expenseTotal: summary.expenseTotal,
          currency: summary.currency || 'EUR',
          recordCount: periodEventCount(summary),
        };
      }
      let oilKg = 0;
      let oliveKg = 0;
      let expenseTotal = 0;
      let recordCount = 0;
      for (const entry of entries) {
        if (agriculturalYearFor(entry.occurredAt) !== agriYear || isTimelineWeather(entry)) continue;
        recordCount += 1;
        oilKg += entry.details.harvest?.oilKg ?? 0;
        oliveKg += entry.details.harvest?.oliveKg ?? 0;
        if (entry.category === 'expense') expenseTotal += entry.amount?.value ?? 0;
      }
      return { oilKg, oliveKg, expenseTotal, currency: 'EUR', recordCount };
    };

    const flat: FlatRow[] = [];
    let previous: DayRow | null = null;
    days.forEach((day) => {
      const monthChanged = !previous || previous.year !== day.year || previous.month !== day.month;
      if (previous && previous.agriYear !== day.agriYear) {
        flat.push({
          kind: 'yearBreak',
          key: `y-${day.agriYear}`,
          agriYear: day.agriYear,
          slash: agriculturalYearSlashLabel(day.agriYear),
          ...glanceFor(day.agriYear),
        });
      } else if (previous) {
        const gap = daysBetween(new Date(previous.dateKey), new Date(day.dateKey));
        if (gap >= 45) {
          flat.push({
            kind: 'gap',
            key: `g-${previous.dateKey}-${day.dateKey}`,
            months: Math.max(2, Math.round(gap / 30)),
          });
        }
      }
      if (monthChanged) {
        const stats = monthStats.get(`${day.year}-${day.month}`) ?? emptyStats();
        flat.push({
          kind: 'monthSummary',
          key: `m-${day.year}-${day.month}`,
          year: day.year,
          month: day.month,
          label: new Date(day.year, day.month - 1, 1).toLocaleDateString(i18n.language, {
            month: 'long',
            year: 'numeric',
          }),
          records: stats.records,
          tasksCompleted: stats.tasksCompleted,
          focus: monthFocusKey(stats),
        });
      }
      flat.push(day);
      previous = day;
    });

    if (loadingMore) {
      flat.push({ kind: 'status', key: 'loading-older', label: t('living.loadingOlder') });
    } else if (!hasMore && entries.length > 0) {
      flat.push({ kind: 'status', key: 'end-journal', label: t('living.endOfJournal') });
    }
    return flat;
  }, [entries, hasMore, hiddenEntryIds, i18n.language, loadingMore, showField, t, yearGlances]);

  const monthMarks: MonthRailItem[] = useMemo(
    () =>
      rows.flatMap((row) =>
        row.kind === 'monthSummary'
          ? [{ key: `${row.year}-${row.month}`, year: row.year, month: row.month }]
          : []
      ),
    [rows]
  );

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: (i) => {
      const row = rows[i];
      if (row?.kind === 'status') return 48;
      if (row?.kind === 'gap' || row?.kind === 'monthSummary') return 48;
      if (row?.kind === 'yearBreak') return 156;
      if (row?.kind === 'day') {
        const records = row.entries.filter((entry) => !isTimelineWeather(entry));
        const display = groupSameDayPhotoEntries(records);
        const photoGroups = display.filter((item) => item.type === 'photoGroup').length;
        const plain = display
          .filter(
            (item): item is Extract<ReturnType<typeof groupSameDayPhotoEntries>[number], { type: 'entry' }> =>
              item.type === 'entry'
          )
          .map((item) => item.entry);
        const featured = plain.filter((entry) => eventCardSpan(entry) === 2);
        const compact = plain.length - featured.length;
        const weatherLine =
          row.monthReviews.length > 0 || row.entries.some(isTimelineWeather) ? 40 : 0;
        return 88 + weatherLine + photoGroups * 168 + featured.length * 188 + Math.ceil(compact / 2) * 120;
      }
      return 168;
    },
    overscan: 8,
    paddingStart: 8,
    paddingEnd: 48,
    scrollMargin,
    scrollPaddingStart: 156,
    getItemKey: (i) => rows[i]?.key ?? i,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const lastIndex = virtualItems[virtualItems.length - 1]?.index ?? -1;

  useLayoutEffect(() => {
    const node = listRef.current;
    if (!node) return undefined;
    const measure = () => {
      const next = Math.round(node.getBoundingClientRect().top + window.scrollY);
      setScrollMargin((prev) => (Math.abs(prev - next) < 2 ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (node.parentElement) observer.observe(node.parentElement);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [rows.length]);

  useEffect(() => {
    if (!hasMore || loadingMore || rows.length === 0) return;
    if (lastIndex >= rows.length - 3) onLoadMore();
  }, [hasMore, lastIndex, loadingMore, onLoadMore, rows.length]);

  useEffect(() => {
    if (rows.length === 0) return undefined;

    const focusKey = (focusDate || '').slice(0, 10);
    const focusRowIndex =
      focusKey.length === 10
        ? rows.findIndex((row) => row.kind === 'day' && row.dateKey === focusKey)
        : -1;

    if (restoredScrollKey.current !== scrollStorageKey) {
      if (focusRowIndex >= 0) {
        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(focusRowIndex, { align: 'start' });
          setActiveDayKey(focusKey);
          jumpedFocusRef.current = focusKey;
        });
      } else {
        const saved = readChronologioJournalScroll(scrollStorageKey);
        requestAnimationFrame(() => {
          window.scrollTo({ top: saved ?? 0, left: 0, behavior: 'auto' });
        });
      }
      restoredScrollKey.current = scrollStorageKey;
    } else if (focusRowIndex >= 0 && focusKey && jumpedFocusRef.current !== focusKey) {
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(focusRowIndex, { align: 'start' });
        setActiveDayKey(focusKey);
        jumpedFocusRef.current = focusKey;
      });
    }

    const syncActiveDay = () => {
      const bar = document.querySelector('.chrono-now-reading');
      const edge = (bar?.getBoundingClientRect().bottom ?? 120) + 8;
      let key: string | null = null;
      listRef.current?.querySelectorAll<HTMLElement>('[data-day-key]').forEach((node) => {
        if (node.getBoundingClientRect().top <= edge) key = node.dataset.dayKey || key;
      });
      if (!key) {
        const first = listRef.current?.querySelector<HTMLElement>('[data-day-key]');
        key = first?.dataset.dayKey || null;
      }
      if (key) setActiveDayKey((prev) => (prev === key ? prev : key));
    };

    const onScroll = () => {
      saveChronologioJournalScroll(scrollStorageKey, window.scrollY);
      syncActiveDay();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    syncActiveDay();
    return () => {
      saveChronologioJournalScroll(scrollStorageKey, window.scrollY);
      window.removeEventListener('scroll', onScroll);
    };
  }, [focusDate, rows, scrollStorageKey, virtualizer]);

  const activeMark =
    monthMarks.find((month) => month.key === readingKey) || monthMarks[0] || null;
  const activeSummary = rows.find(
    (row): row is Extract<FlatRow, { kind: 'monthSummary' }> =>
      row.kind === 'monthSummary' &&
      activeMark != null &&
      row.year === activeMark.year &&
      row.month === activeMark.month
  );
  const readingLabel = activeSummary
    ? activeSummary.focus
      ? `${activeSummary.label} · ${t(`primaryCategories.${activeSummary.focus}`)}`
      : activeSummary.label
    : '';

  const jumpToMonth = (month: MonthRailItem) => {
    const index = rows.findIndex(
      (row) => row.kind === 'monthSummary' && row.year === month.year && row.month === month.month
    );
    if (index < 0) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    virtualizer.scrollToIndex(index, { align: 'start', behavior: reduce ? 'auto' : 'smooth' });
  };

  const monthSummaryText = (row: Extract<FlatRow, { kind: 'monthSummary' }>) => {
    const entriesLabel = t('timeline.entryCount', { count: row.records });
    if (row.tasksCompleted <= 0) {
      return t('timeline.monthSummary', { month: row.label, entries: entriesLabel });
    }
    return t('timeline.monthSummaryTasks', {
      month: row.label,
      entries: entriesLabel,
      tasks: t('timeline.tasksCompleted', { count: row.tasksCompleted }),
    });
  };

  return (
    <div className="chrono-month-view chrono-journal-view chrono-day-timeline">
      <ChronologioTimelineFrame
        label={readingLabel}
        labelKey={activeMark?.key || 'none'}
        months={monthMarks}
        activeKey={activeMark?.key || null}
        onJump={jumpToMonth}
      >
        <div ref={listRef} className="chrono-journal-flow">
          <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
            {virtualItems.map((vRow) => {
              const row = rows[vRow.index];
              const monthKey =
                row.kind === 'day' || row.kind === 'monthSummary' ? `${row.year}-${row.month}` : undefined;
              return (
                <div
                  key={row.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vRow.start - scrollMargin}px)`,
                  }}
                  ref={virtualizer.measureElement}
                  data-index={vRow.index}
                  data-day-key={row.kind === 'day' ? row.dateKey : undefined}
                  data-month-key={monthKey}
                  className={`chrono-month-virtual-row${row.kind === 'status' ? '' : ' has-spine'}`}
                >
                  {row.kind === 'status' ? null : (
                    <div
                      className={`chrono-rail-track${
                        row.kind === 'day' && row.dateKey === activeDayKey ? ' is-active' : ''
                      }`}
                      aria-hidden
                    >
                      {row.kind === 'day' ? <span className="chrono-day-node" /> : null}
                    </div>
                  )}
                  {row.kind === 'status' ? (
                    <p className="chrono-journal-status">{row.label}</p>
                  ) : row.kind === 'gap' ? (
                    <p className="chrono-timeline-gap">{t('timeline.gapMonths', { count: row.months })}</p>
                  ) : row.kind === 'monthSummary' ? (
                    <p className="chrono-timeline-month">{monthSummaryText(row)}</p>
                  ) : row.kind === 'yearBreak' ? (
                    <section className="chrono-year-glance">
                      <h3>{t('timeline.yearGlance', { years: row.slash })}</h3>
                      <ChronologioGlanceFacts
                        oilKg={row.oilKg}
                        oliveKg={row.oliveKg}
                        expenseTotal={row.expenseTotal}
                        currency={row.currency}
                        recordCount={row.recordCount}
                        numberLocale={numberLocale}
                      />
                    </section>
                  ) : (
                    <DayBlock
                      row={row}
                      showField={showField}
                      locale={locale}
                      selectedEntryId={selectedEntryId}
                      weather={buildDayWeatherView(weatherFor(row.dateKey), numberLocale)}
                      onOpenWeather={
                        onOpenWeather
                          ? () => onOpenWeather(row.year, row.month, row.dateKey)
                          : undefined
                      }
                      onSelect={selectEntry}
                      onOpenPhotoDay={openPhotoDay}
                      entryCountLabel={t('timeline.entryCount', {
                        count: row.entries.filter((entry) => !isTimelineWeather(entry)).length,
                      })}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </ChronologioTimelineFrame>
      <ChronologioPhotoDaySheet
        open={!!photoDayEntries?.length}
        entries={photoDayEntries || []}
        onClose={() => setPhotoDayEntries(null)}
      />
    </div>
  );
};

const DayBlock: React.FC<{
  row: DayRow;
  showField: boolean;
  locale: SupportedLocale;
  selectedEntryId?: string | null;
  weather: ReturnType<typeof buildDayWeatherView>;
  entryCountLabel: string;
  onOpenWeather?: () => void;
  onSelect: (entry: ChronologioEntry) => void;
  onOpenPhotoDay: (entries: ChronologioEntry[]) => void;
}> = ({
  row,
  showField,
  locale,
  selectedEntryId,
  weather,
  entryCountLabel,
  onOpenWeather,
  onSelect,
  onOpenPhotoDay,
}) => {
  const records = row.entries.filter((entry) => !isTimelineWeather(entry));
  const weatherNotes = [...row.monthReviews, ...row.entries.filter(isTimelineWeather)];

  return (
    <section className="chrono-day-group" aria-labelledby={`chrono-day-${row.dateKey}`}>
      <header className="chrono-day-header">
        <h3 id={`chrono-day-${row.dateKey}`} className="chrono-day-heading">
          {row.label}
        </h3>
        <div className="chrono-day-meta chrono-day-weather-line">
          <DailyWeatherStrip weather={weather} onOpen={onOpenWeather} />
          {weatherNotes.map((entry) =>
            isWeatherExtremeEventType(entry.eventType) ? (
              <ChronologioExtremeBanner key={entry.id} entry={entry} showField={showField} />
            ) : (
              <button
                key={entry.id}
                type="button"
                className="chrono-day-wx-note"
                onClick={() => onSelect(entry)}
              >
                {entry.title}
              </button>
            )
          )}
          <span>{entryCountLabel}</span>
        </div>
      </header>
      {records.length > 0 ? (
        <div className="chrono-day-event-grid">
          {groupSameDayPhotoEntries(records).map((item) => {
            if (item.type === 'photoGroup') {
              const selected = item.entries.some((entry) => entry.id === selectedEntryId);
              return (
                <div key={item.id} className="chrono-day-event-cell is-featured is-quiet">
                  <ChronologioPhotoStackCard
                    entries={item.entries}
                    selected={selected}
                    showField={showField}
                    onOpen={() => onOpenPhotoDay(item.entries)}
                  />
                </div>
              );
            }
            const entry = item.entry;
            const featured = eventCardSpan(entry) === 2;
            const quiet = entry.category === 'note' || entry.category === 'photo';
            const harvest = entry.category === 'harvest';
            return (
              <div
                key={entry.id}
                className={`chrono-day-event-cell${featured ? ' is-featured' : ''}${quiet ? ' is-quiet' : ''}${harvest ? ' is-harvest' : ''}`}
              >
                <ChronologioEvent
                  entry={entry}
                  density="card"
                  showField={showField}
                  locale={locale}
                  selected={selectedEntryId === entry.id}
                  onSelect={onSelect}
                />
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};

export default ChronologioMonthView;

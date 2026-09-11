import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ChronologioEntry } from '../../services/chronologioService';
import { groupChronologioEntries } from '../../utils/chronologioGrouping';
import { agriculturalYearFor, agriculturalYearTitle } from '../../chronologio/agriculturalYear';
import {
  buildDayWeatherView,
  dayWeatherDateKey,
  type DayWeatherInput,
} from '../../chronologio/dayWeather';
import { eventCardSpan } from '../../chronologio/eventCardLayout';
import ChronologioEvent from './ChronologioEvent';
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
  onLoadMore: () => void;
  onSelect: (entry: ChronologioEntry) => void;
  onOpenWeather?: (year: number, month: number, dateKey: string) => void;
};

type FlatRow =
  | {
      kind: 'day';
      key: string;
      dateKey: string;
      label: string;
      monthLabel: string;
      agriLabel: string;
      year: number;
      month: number;
      entries: ChronologioEntry[];
      monthReviews: ChronologioEntry[];
    }
  | { kind: 'gap'; key: string; months: number }
  | { kind: 'monthBreak'; key: string; label: string }
  | { kind: 'yearBreak'; key: string; year: number }
  | { kind: 'status'; key: string; label: string };

const daysBetween = (newer: Date, older: Date) =>
  Math.round(Math.abs(newer.getTime() - older.getTime()) / 86_400_000);

const isYearWeatherReview = (e: ChronologioEntry) => e.eventType === 'weather.yearReview';
const isMonthWeatherReview = (e: ChronologioEntry) => e.eventType === 'weather.monthReview';

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
  onLoadMore,
  onSelect,
  onOpenWeather,
}) => {
  const { t, i18n } = useTranslation(['chronologio', 'today']);
  const parentRef = useRef<HTMLDivElement>(null);
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

  const rows = useMemo(() => {
    const model = groupChronologioEntries(entries);
    const days: Extract<FlatRow, { kind: 'day' }>[] = [];
    for (const month of model.months) {
      for (const day of month.days) {
        const visible = day.entries.filter(
          (entry) => !isYearWeatherReview(entry) && !hiddenEntryIds?.has(entry.id)
        );
        if (visible.length === 0) continue;
        const monthReviews = showField ? visible.filter(isMonthWeatherReview) : [];
        const rest = showField ? visible.filter((entry) => !isMonthWeatherReview(entry)) : visible;
        const agriYear = agriculturalYearFor(day.date);
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
          monthLabel: day.date.toLocaleDateString(i18n.language, { month: 'long' }),
          agriLabel: agriculturalYearTitle(agriYear, i18n.language),
          year: day.date.getFullYear(),
          month: day.date.getMonth() + 1,
          entries: rest,
          monthReviews,
        });
      }
    }

    const flat: FlatRow[] = [];
    let previous: Extract<FlatRow, { kind: 'day' }> | null = null;
    days.forEach((day) => {
      if (previous && previous.year !== day.year) {
        flat.push({ kind: 'yearBreak', key: `y-${day.year}-${day.dateKey}`, year: day.year });
      } else if (previous && previous.month !== day.month) {
        const gap = daysBetween(new Date(previous.dateKey), new Date(day.dateKey));
        if (gap >= 45) {
          flat.push({
            kind: 'gap',
            key: `g-${previous.dateKey}-${day.dateKey}`,
            months: Math.max(2, Math.round(gap / 30)),
          });
        }
        flat.push({
          kind: 'monthBreak',
          key: `m-${day.year}-${day.month}-${day.dateKey}`,
          label: new Date(day.year, day.month - 1, 1).toLocaleDateString(i18n.language, {
            month: 'long',
            year: 'numeric',
          }),
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
      flat.push(day);
      previous = day;
    });

    if (loadingMore) {
      flat.push({ kind: 'status', key: 'loading-older', label: t('living.loadingOlder') });
    } else if (!hasMore && entries.length > 0) {
      flat.push({ kind: 'status', key: 'end-journal', label: t('living.endOfJournal') });
    }
    return flat;
  }, [entries, hasMore, hiddenEntryIds, i18n.language, loadingMore, showField, t]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    getItemKey: (i) => rows[i]?.key ?? i,
    estimateSize: (i) => {
      const row = rows[i];
      if (row?.kind === 'status') return 48;
      if (row?.kind === 'gap' || row?.kind === 'monthBreak') return 56;
      if (row?.kind === 'yearBreak') return 72;
      if (row?.kind === 'day') {
        const featured =
          row.entries.length === 1
            ? row.entries
            : row.entries.filter((e) => eventCardSpan(e) === 2);
        const compact = row.entries.length <= 1 ? 0 : row.entries.length - featured.length;
        const richMonth = featured.filter(isMonthWeatherReview).length;
        const otherFeatured = featured.length - richMonth;
        const pickH = row.monthReviews.length > 0 ? 196 : 0;
        return 88 + pickH + richMonth * 360 + otherFeatured * 168 + Math.ceil(compact / 2) * 168;
      }
      return 168;
    },
    overscan: 8,
    paddingEnd: 32,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const lastIndex = virtualItems[virtualItems.length - 1]?.index ?? -1;

  useEffect(() => {
    if (!hasMore || loadingMore || rows.length === 0) return;
    if (lastIndex >= rows.length - 3) onLoadMore();
  }, [hasMore, lastIndex, loadingMore, onLoadMore, rows.length]);

  return (
    <div className="chrono-month-view chrono-journal-view chrono-day-timeline">
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
                {row.kind === 'status' ? (
                  <p className="chrono-journal-status">{row.label}</p>
                ) : row.kind === 'gap' ? (
                  <p className="chrono-timeline-gap">{t('timeline.gapMonths', { count: row.months })}</p>
                ) : row.kind === 'monthBreak' ? (
                  <p className="chrono-timeline-month">{row.label}</p>
                ) : row.kind === 'yearBreak' ? (
                  <p className="chrono-timeline-year">{t('timeline.yearLandmark', { year: row.year })}</p>
                ) : (
                  <section className="chrono-day-group" aria-labelledby={`chrono-day-${row.dateKey}`}>
                    <header className="chrono-day-header">
                      <h3 id={`chrono-day-${row.dateKey}`} className="chrono-day-heading">
                        {row.label}
                      </h3>
                      <p className="chrono-day-meta">
                        <DailyWeatherStrip
                          weather={buildDayWeatherView(weatherFor(row.dateKey), numberLocale)}
                          onOpen={
                            onOpenWeather
                              ? () => onOpenWeather(row.year, row.month, row.dateKey)
                              : undefined
                          }
                        />
                        <span>
                          {t('timeline.entryCount', {
                            count: row.entries.length + row.monthReviews.length,
                          })}
                        </span>
                      </p>
                    </header>
                    {row.monthReviews.length > 0 ? (
                      <div className="chrono-weather-cluster">
                        <p className="chrono-weather-cluster-kicker">{t('weatherReview.pickGrove')}</p>
                        <div className="chrono-weather-cluster-row" role="list">
                          {row.monthReviews.map((entry) => (
                            <div
                              key={entry.id}
                              className="chrono-day-event-cell is-field-pick"
                              role="listitem"
                            >
                              <ChronologioEvent
                                entry={entry}
                                density="card"
                                showField
                                locale={locale}
                                selected={selectedEntryId === entry.id}
                                weatherTile
                                onSelect={onSelect}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {row.entries.length > 0 ? (
                    <div className="chrono-day-event-grid">
                      {row.entries.map((entry) => {
                        const featured = row.entries.length === 1 || eventCardSpan(entry) === 2;
                        return (
                          <div
                            key={entry.id}
                            className={`chrono-day-event-cell${featured ? ' is-featured' : ''}`}
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
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChronologioMonthView;

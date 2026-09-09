import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CloudSun } from 'lucide-react';
import type { ChronologioEntry } from '../../services/chronologioService';
import { groupChronologioEntries } from '../../utils/chronologioGrouping';
import ChronologioEvent from './ChronologioEvent';
import type { SupportedLocale } from '../../i18n/config';

type Props = {
  entries: ChronologioEntry[];
  showField: boolean;
  locale: SupportedLocale;
  selectedEntryId?: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onSelect: (entry: ChronologioEntry) => void;
  onOpenWeather?: (year: number, month: number) => void;
};

type FlatRow =
  | { kind: 'day'; key: string; label: string; shortLabel: string; year: number; month: number }
  | { kind: 'entry'; key: string; entry: ChronologioEntry }
  | { kind: 'status'; key: string; label: string };

const isPeriodWeatherEntry = (e: ChronologioEntry) =>
  e.eventType === 'weather.monthReview' || e.eventType === 'weather.yearReview';

const ChronologioMonthView: React.FC<Props> = ({
  entries,
  showField,
  locale,
  selectedEntryId,
  hasMore,
  loadingMore,
  onLoadMore,
  onSelect,
  onOpenWeather,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const parentRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const nowYear = new Date().getFullYear();
  const [stickyDate, setStickyDate] = useState<{
    label: string;
    shortLabel: string;
    year: number;
    month: number;
  } | null>(null);

  const rows = useMemo(() => {
    const model = groupChronologioEntries(entries);
    const flat: FlatRow[] = [];
    for (const month of model.months) {
      for (const day of month.days) {
        const includeYear = day.date.getFullYear() !== nowYear;
        const label =
          day.kind === 'today'
            ? t('today')
            : day.kind === 'yesterday'
              ? t('yesterday')
              : day.date.toLocaleDateString(i18n.language, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: includeYear ? 'numeric' : undefined,
                });
        const shortLabel =
          day.kind === 'today'
            ? t('today')
            : day.kind === 'yesterday'
              ? t('yesterday')
              : day.date.toLocaleDateString(i18n.language, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: includeYear ? '2-digit' : undefined,
                });
        flat.push({
          kind: 'day',
          key: `d-${day.key}`,
          label,
          shortLabel,
          year: day.date.getFullYear(),
          month: day.date.getMonth() + 1,
        });
        for (const entry of day.entries) {
          if (isPeriodWeatherEntry(entry)) continue;
          flat.push({ kind: 'entry', key: entry.id, entry });
        }
      }
    }
    if (loadingMore) {
      flat.push({ kind: 'status', key: 'loading-older', label: t('living.loadingOlder') });
    } else if (!hasMore && entries.length > 0) {
      flat.push({ kind: 'status', key: 'end-journal', label: t('living.endOfJournal') });
    }
    return flat;
  }, [entries, hasMore, i18n.language, loadingMore, nowYear, t]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => {
      const row = rows[i];
      if (row?.kind === 'day') return 44;
      if (row?.kind === 'status') return 48;
      return 168;
    },
    overscan: 8,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const lastIndex = virtualItems[virtualItems.length - 1]?.index ?? -1;
  const firstIndex = virtualItems[0]?.index ?? 0;

  useEffect(() => {
    if (!hasMore || loadingMore || rows.length === 0) return;
    if (lastIndex >= rows.length - 4) {
      onLoadMore();
    }
  }, [hasMore, lastIndex, loadingMore, onLoadMore, rows.length]);

  useEffect(() => {
    if (rows.length === 0) {
      setStickyDate(null);
      return;
    }
    let next: {
      label: string;
      shortLabel: string;
      year: number;
      month: number;
    } | null = null;
    for (let i = firstIndex; i >= 0; i -= 1) {
      const row = rows[i];
      if (row?.kind === 'day') {
        next = {
          label: row.label,
          shortLabel: row.shortLabel,
          year: row.year,
          month: row.month,
        };
        break;
      }
    }
    if (!next) {
      const firstDay = rows.find((r): r is Extract<FlatRow, { kind: 'day' }> => r.kind === 'day');
      if (firstDay) {
        next = {
          label: firstDay.label,
          shortLabel: firstDay.shortLabel,
          year: firstDay.year,
          month: firstDay.month,
        };
      }
    }
    setStickyDate((prev) => {
      if (
        prev?.label === next?.label &&
        prev?.shortLabel === next?.shortLabel &&
        prev?.year === next?.year &&
        prev?.month === next?.month
      ) {
        return prev;
      }
      return next;
    });
  }, [firstIndex, rows]);

  return (
    <div className="chrono-month-view chrono-journal-view">
      <div ref={parentRef} className="chrono-month-scroll chrono-journal-scroll">
        <div className="chrono-sticky-date-host" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {stickyDate ? (
              <motion.div
                key={`${stickyDate.year}-${stickyDate.month}-${stickyDate.label}`}
                className="chrono-sticky-date-stack"
                initial={reduceMotion ? false : { opacity: 0, y: -6, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={reduceMotion ? undefined : { opacity: 0, y: 6, filter: 'blur(4px)' }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
              >
                <div className="chrono-sticky-date" title={stickyDate.label}>
                  <span className="chrono-sticky-date-short">{stickyDate.shortLabel}</span>
                  <span className="chrono-sticky-date-full">{stickyDate.label}</span>
                </div>
                {onOpenWeather ? (
                  <button
                    type="button"
                    className="chrono-sticky-weather-btn"
                    onClick={() => onOpenWeather(stickyDate.year, stickyDate.month)}
                  >
                    <CloudSun size={14} aria-hidden />
                    {t('living.weatherButton')}
                  </button>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
          {virtualItems.map((vRow) => {
            const row = rows[vRow.index];
            const isActiveDay =
              row.kind === 'day' && stickyDate != null && row.label === stickyDate.label;
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
                {row.kind === 'day' ? (
                  <h3 className={`chrono-day-heading ${isActiveDay ? 'is-sticky-active' : ''}`}>
                    {row.label}
                  </h3>
                ) : row.kind === 'status' ? (
                  <p className="chrono-journal-status">{row.label}</p>
                ) : (
                  <ChronologioEvent
                    entry={row.entry}
                    density="card"
                    showField={showField}
                    locale={locale}
                    selected={selectedEntryId === row.entry.id}
                    onSelect={onSelect}
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

export default ChronologioMonthView;

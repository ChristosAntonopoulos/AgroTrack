import React, { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ChronologioEntry } from '../../services/chronologioService';
import { groupChronologioEntries } from '../../utils/chronologioGrouping';
import ChronologioEvent from './ChronologioEvent';
import type { SupportedLocale } from '../../i18n/config';

type Props = {
  entries: ChronologioEntry[];
  showField: boolean;
  locale: SupportedLocale;
  monthTitle: string;
  selectedEntryId?: string | null;
  onSelect: (entry: ChronologioEntry) => void;
};

type FlatRow =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'entry'; key: string; entry: ChronologioEntry };

const ChronologioMonthView: React.FC<Props> = ({
  entries,
  showField,
  locale,
  monthTitle,
  selectedEntryId,
  onSelect,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const parentRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const model = groupChronologioEntries(entries);
    const flat: FlatRow[] = [];
    for (const month of model.months) {
      for (const day of month.days) {
        const label =
          day.kind === 'today'
            ? t('today')
            : day.kind === 'yesterday'
              ? t('yesterday')
              : day.date.toLocaleDateString(i18n.language, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                });
        flat.push({ kind: 'day', key: `d-${day.key}`, label });
        for (const entry of day.entries) {
          flat.push({ kind: 'entry', key: entry.id, entry });
        }
      }
    }
    return flat;
  }, [entries, i18n.language, t]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => (rows[i]?.kind === 'day' ? 44 : 96),
    overscan: 8,
  });

  return (
    <div className="chrono-month-view">
      <h2 className="chrono-month-view-title">{monthTitle}</h2>
      <div ref={parentRef} className="chrono-month-scroll">
        <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
          {virtualizer.getVirtualItems().map((vRow) => {
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
                {row.kind === 'day' ? (
                  <h3 className="chrono-day-heading">{row.label}</h3>
                ) : (
                  <ChronologioEvent
                    entry={row.entry}
                    density="compact"
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

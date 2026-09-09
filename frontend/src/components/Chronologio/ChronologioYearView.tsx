import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChronologioMonthSummary, ChronologioPeriodSummary } from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';

type Props = {
  period: ChronologioPeriodSummary | null;
  months: ChronologioMonthSummary[];
  focusMonth: number;
  focusMonthYear: number;
  numberLocale: string;
  onOpenMonth: (year: number, month: number) => void;
};

const ChronologioYearView: React.FC<Props> = ({
  period,
  months,
  focusMonth,
  focusMonthYear,
  numberLocale,
  onOpenMonth,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const now = new Date();
  const nowMonth = now.getMonth() + 1;
  const nowYear = now.getFullYear();

  const monthNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { month: 'short', timeZone: 'UTC' });
    return Array.from({ length: 12 }, (_, i) =>
      fmt.format(new Date(Date.UTC(2020, i, 1))).replace(/\./g, '').toUpperCase()
    );
  }, [i18n.language]);

  const summaryBits = useMemo(() => {
    if (!period) return [] as string[];
    const bits: string[] = [];
    if (period.taskCount > 0) bits.push(t('living.statTasks', { count: period.taskCount }));
    if (period.expenseTotal > 0) {
      bits.push(
        t('living.statExpenses', {
          amount: formatChronologioMoney(period.expenseTotal, period.currency, numberLocale),
        })
      );
    }
    if (period.oliveKg > 0) {
      bits.push(
        t('living.statOlives', { kg: Math.round(period.oliveKg).toLocaleString(numberLocale) })
      );
    }
    if (period.oilKg > 0) {
      bits.push(t('living.statOil', { kg: Math.round(period.oilKg).toLocaleString(numberLocale) }));
    }
    if (period.oilYieldPercent != null && period.oilYieldPercent > 0) {
      bits.push(t('living.statYield', { pct: period.oilYieldPercent }));
    }
    return bits;
  }, [numberLocale, period, t]);

  return (
    <div className="chrono-year-view">
      <header className="chrono-year-view-header">
        <h2 className="chrono-year-view-title">{period?.periodYear ?? period?.key ?? '—'}</h2>
        {summaryBits.length > 0 ? (
          <p className="chrono-year-inline-summary">{summaryBits.join(' · ')}</p>
        ) : (
          <p className="chrono-year-inline-summary is-muted">
            {t('living.emptyYear', { year: period?.periodYear ?? '' })}
          </p>
        )}
      </header>

      <ul className="chrono-month-spine" role="list">
        {months.map((m) => {
          const active = m.month === focusMonth && m.year === focusMonthYear;
          const isNow = m.month === nowMonth && m.year === nowYear;
          const eventCount = m.taskCount + m.expenseCount + m.harvestCount + m.noteCount;
          const highlights = (m.highlightTitles || []).filter(Boolean).slice(0, 3);
          const overflow = Math.max(0, eventCount - highlights.length);
          const important = m.harvestCount > 0 || (m.oliveKg > 0 && m.oliveKg >= 500);

          const metaParts: string[] = [];
          if (eventCount > 0) {
            metaParts.push(
              eventCount === 1
                ? t('living.monthOneEvent')
                : t('living.monthWorks', { count: eventCount })
            );
          }
          if (m.expenseTotal > 0) {
            metaParts.push(
              formatChronologioMoney(m.expenseTotal, m.currency, numberLocale)
            );
          }
          if (m.oliveKg > 0) {
            metaParts.push(
              `${Math.round(m.oliveKg).toLocaleString(numberLocale)} kg`
            );
          }

          return (
            <li key={m.key} role="listitem">
              <button
                type="button"
                className={`chrono-month-row${active ? ' is-active' : ''}${eventCount === 0 ? ' is-empty' : ''}${important ? ' is-important' : ''}${isNow ? ' is-now' : ''}`}
                onClick={() => onOpenMonth(m.year, m.month)}
              >
                <span className="chrono-month-label">
                  {monthNames[m.month - 1]}
                  {isNow ? <span className="chrono-month-now">{t('living.now')}</span> : null}
                </span>
                <span className="chrono-month-dash" aria-hidden />
                <span className="chrono-month-content">
                  {highlights.length > 0 ? (
                    <span className="chrono-month-highlights">
                      {highlights.join(' · ')}
                    </span>
                  ) : eventCount === 0 ? (
                    <span className="chrono-month-quiet" aria-hidden>
                      ─────────────────
                    </span>
                  ) : null}
                  {metaParts.length > 0 ? (
                    <span className="chrono-month-meta">{metaParts.join(' · ')}</span>
                  ) : null}
                  {overflow > 0 && highlights.length > 0 ? (
                    <span className="chrono-month-more">
                      {t('living.moreEvents', { count: overflow })}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ChronologioYearView;

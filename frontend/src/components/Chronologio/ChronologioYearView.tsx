import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChronologioMonthSummary, ChronologioPeriodSummary } from '../../services/chronologioService';
import { isRealChronologioMediaUrl } from '../../chronologio/mediaGuard';
import {
  monthChapterFacts,
  periodEventCount,
  yearFixedMetrics,
  weatherFactBits,
} from '../../chronologio/summaryFacts';
import ChronologioThumbnail from './ChronologioThumbnail';

type Props = {
  period: ChronologioPeriodSummary | null;
  months: ChronologioMonthSummary[];
  focusMonth: number;
  focusMonthYear: number;
  numberLocale: string;
  /** Opens month Peek — does not jump to Ημέρες. */
  onPeekMonth: (year: number, month: number) => void;
};

const ChronologioYearView: React.FC<Props> = ({
  period,
  months,
  focusMonth,
  focusMonthYear,
  numberLocale,
  onPeekMonth,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const now = new Date();
  const nowMonth = now.getMonth() + 1;
  const nowYear = now.getFullYear();

  const orderedMonths = useMemo(() => {
    return [...months]
      .filter((m) => m.year < nowYear || (m.year === nowYear && m.month <= nowMonth))
      .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month));
  }, [months, nowMonth, nowYear]);

  const periodMetrics = useMemo(
    () => (period ? yearFixedMetrics(period, numberLocale, t) : []),
    [numberLocale, period, t]
  );
  const periodWeather = useMemo(
    () => (period ? weatherFactBits(period, t) : []),
    [period, t]
  );

  const monthTitle = (m: ChronologioMonthSummary) =>
    new Date(Date.UTC(m.year, m.month - 1, 1)).toLocaleDateString(i18n.language, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

  return (
    <div className="chrono-year-view">
      <header className="chrono-year-view-header">
        <h2 className="chrono-year-view-title">{period?.periodYear ?? period?.key ?? '—'}</h2>
        {periodMetrics.length > 0 ? (
          <ul className="chrono-year-metrics chrono-year-view-metrics">
            {periodMetrics.map((m) => (
              <li key={m.label}>
                <span className="chrono-metric-value">{m.value}</span>
                <span className="chrono-metric-label">{m.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="chrono-year-inline-summary is-muted">
            {t('living.emptyYear', { year: period?.periodYear ?? '' })}
          </p>
        )}
        {periodWeather.length > 0 ? (
          <p className="chrono-year-weather-line">{periodWeather.join(' · ')}</p>
        ) : null}
      </header>

      <ul className="chrono-month-gallery">
        {orderedMonths.map((m) => {
          const eventCount = periodEventCount(m);
          const active = m.month === focusMonth && m.year === focusMonthYear;
          const isNow = m.month === nowMonth && m.year === nowYear;
          const highlights = (m.highlightTitles || []).filter(Boolean).slice(0, 2);
          const hero = isRealChronologioMediaUrl(m.heroMediaUrl) ? m.heroMediaUrl! : undefined;
          const title = monthTitle(m);
          const facts = monthChapterFacts(m, numberLocale, t);

          if (eventCount === 0) {
            return (
              <li key={m.key}>
                <button
                  type="button"
                  className={`chrono-month-quiet-row${active ? ' is-active' : ''}`}
                  onClick={() => onPeekMonth(m.year, m.month)}
                >
                  <span className="chrono-month-quiet-title">{title}</span>
                  <span className="chrono-month-quiet-hint">{t('living.emptyPeriod')}</span>
                </button>
              </li>
            );
          }

          return (
            <li key={m.key}>
              <button
                type="button"
                className={`chrono-month-chapter${active ? ' is-active' : ''}${isNow ? ' is-now' : ''}`}
                onClick={() => onPeekMonth(m.year, m.month)}
                aria-label={t('living.seeMonth', { month: title })}
              >
                <span className="chrono-month-chapter-text">
                  <span className="chrono-month-poster-title-row">
                    <span className="chrono-month-poster-title">{title}</span>
                    {isNow ? <span className="chrono-month-now">{t('living.thisMonth')}</span> : null}
                  </span>
                  {highlights.length > 0 ? (
                    <span className="chrono-month-highlights">{highlights.join(' · ')}</span>
                  ) : null}
                  {facts.length > 0 ? (
                    <span className="chrono-month-meta">{facts.join(' · ')}</span>
                  ) : null}
                </span>
                {hero ? (
                  <ChronologioThumbnail src={hero} className="chrono-month-chapter-hero" />
                ) : (
                  <span className="chrono-month-chapter-wash" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ChronologioYearView;

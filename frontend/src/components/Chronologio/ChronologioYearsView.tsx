import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChronologioPeriodSummary } from '../../services/chronologioService';
import { isRealChronologioMediaUrl } from '../../chronologio/mediaGuard';
import { weatherFactBits, yearFixedMetrics } from '../../chronologio/summaryFacts';
import ChronologioThumbnail from './ChronologioThumbnail';

type Props = {
  summaries: ChronologioPeriodSummary[];
  activePeriodYear: number;
  numberLocale: string;
  /** Opens year Peek — does not jump to Μήνες. */
  onPeekYear: (periodYear: number) => void;
};

const ChronologioYearsView: React.FC<Props> = ({
  summaries,
  activePeriodYear,
  numberLocale,
  onPeekYear,
}) => {
  const { t } = useTranslation('chronologio');
  const nowYear = new Date().getUTCFullYear();
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }, [activePeriodYear]);

  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="chrono-years chrono-history">
      {summaries.map((s) => {
        const isActive = s.periodYear === activePeriodYear;
        const isCurrent = s.periodYear === nowYear;
        const metrics = yearFixedMetrics(s, numberLocale, t);
        const weatherBits = weatherFactBits(s, t);
        const hero = isRealChronologioMediaUrl(s.heroMediaUrl) ? s.heroMediaUrl! : undefined;

        return (
          <button
            key={s.key}
            id={`chrono-year-${s.periodYear}`}
            ref={isActive ? activeRef : undefined}
            type="button"
            className={`chrono-history-card${isActive ? ' is-active' : ''}${isCurrent ? ' is-current' : ''}`}
            onClick={() => onPeekYear(s.periodYear)}
            aria-label={t('living.seeYear', { year: s.periodYear })}
          >
            <div className={`chrono-history-media${hero ? '' : ' is-text-only'}`}>
              {hero ? (
                <ChronologioThumbnail src={hero} className="chrono-history-hero" />
              ) : (
                <p className="chrono-history-no-photo">{t('living.noPhoto')}</p>
              )}
              <div className="chrono-history-overlay">
                <h2 className="chrono-year-title">{s.periodYear}</h2>
                {isCurrent ? (
                  <span className="chrono-today-pill">{t('living.currentYear')}</span>
                ) : null}
              </div>
            </div>

            <ul className="chrono-year-metrics">
              {metrics.map((m) => (
                <li key={m.label}>
                  <span className="chrono-metric-value">{m.value}</span>
                  <span className="chrono-metric-label">{m.label}</span>
                </li>
              ))}
            </ul>
            {weatherBits.length > 0 ? (
              <p className="chrono-year-weather-line">{weatherBits.join(' · ')}</p>
            ) : null}
          </button>
        );
      })}
      <p className="chrono-years-origin">{t('living.historyStartsHere')}</p>
    </div>
  );
};

export default ChronologioYearsView;

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import type { ChronologioPeriodSummary } from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import { isRealChronologioMediaUrl } from '../../chronologio/mediaGuard';
import ChronologioThumbnail from './ChronologioThumbnail';

type Props = {
  summaries: ChronologioPeriodSummary[];
  activePeriodYear: number;
  numberLocale: string;
  onOpenPeriod: (periodYear: number) => void;
};

type Metric = { value: string; label: string };

const ChronologioYearsView: React.FC<Props> = ({
  summaries,
  activePeriodYear,
  numberLocale,
  onOpenPeriod,
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

  const metricsFor = (s: ChronologioPeriodSummary): Metric[] => {
    const items: Metric[] = [];
    if (s.taskCount > 0) {
      items.push({ value: String(s.taskCount), label: t('living.metricTasks') });
    }
    if (s.expenseTotal > 0) {
      items.push({
        value: formatChronologioMoney(s.expenseTotal, s.currency, numberLocale),
        label: t('living.metricExpenses'),
      });
    }
    if (s.oliveKg > 0) {
      items.push({
        value: `${Math.round(s.oliveKg).toLocaleString(numberLocale)} kg`,
        label: t('living.metricOlives'),
      });
    }
    if (s.oilKg > 0) {
      items.push({
        value: `${Math.round(s.oilKg).toLocaleString(numberLocale)} kg`,
        label: t('living.metricOil'),
      });
    }
    if (s.oilYieldPercent != null && s.oilYieldPercent > 0) {
      items.push({
        value: `${s.oilYieldPercent}%`,
        label: t('living.metricYield'),
      });
    }
    return items;
  };

  return (
    <div className="chrono-years" role="list">
      {summaries.map((s) => {
        const isActive = s.periodYear === activePeriodYear;
        const isCurrent = s.periodYear === nowYear;
        const metrics = metricsFor(s);
        const hero =
          isRealChronologioMediaUrl(s.heroMediaUrl) ? s.heroMediaUrl! : undefined;

        return (
          <button
            key={s.key}
            id={`chrono-year-${s.periodYear}`}
            ref={isActive ? activeRef : undefined}
            type="button"
            role="listitem"
            className={`chrono-year-chapter${isActive ? ' is-active' : ''}${isCurrent ? ' is-current' : ''}`}
            onClick={() => onOpenPeriod(s.periodYear)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenPeriod(s.periodYear);
              }
            }}
          >
            <div className="chrono-year-rail">
              <span className={`chrono-year-dot${isCurrent || isActive ? ' is-today' : ''}`} aria-hidden />
              <span className="chrono-year-line" aria-hidden />
            </div>
            <div className="chrono-year-body">
              <div className="chrono-year-title-row">
                <h2 className="chrono-year-title">{s.periodYear}</h2>
                {isCurrent ? (
                  <span className="chrono-today-pill">{t('living.currentYear')}</span>
                ) : null}
                <span className="chrono-year-cta">
                  {t('living.seeYear', { year: s.periodYear })}
                  <ArrowRight size={14} aria-hidden />
                </span>
              </div>

              {hero ? (
                <ChronologioThumbnail src={hero} className="chrono-year-hero" />
              ) : (
                <div className="chrono-year-placeholder" aria-hidden />
              )}

              {metrics.length > 0 ? (
                <ul className="chrono-year-metrics">
                  {metrics.map((m) => (
                    <li key={m.label}>
                      <span className="chrono-metric-value">{m.value}</span>
                      <span className="chrono-metric-label">{m.label}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="chrono-year-empty-hint">{t('living.emptyPeriod')}</p>
              )}
            </div>
          </button>
        );
      })}
      <p className="chrono-years-origin">{t('living.historyStartsHere')}</p>
    </div>
  );
};

export default ChronologioYearsView;

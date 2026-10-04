import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ChronologioPeriodSummary } from '../../services/chronologioService';
import { agriculturalYearRangeLabel } from '../../chronologio/agriculturalYear';
import { isRealChronologioMediaUrl } from '../../chronologio/mediaGuard';
import { harvestHasResult } from '../../chronologio/monthPresentation';
import { yearFixedMetrics } from '../../chronologio/summaryFacts';
import { formatGroveMassKg } from '../../utils/groveTotals';
import {
  harvestYearCopyKey,
  yearComparison,
  yearComparisonCopyKey,
  yearHeadline,
  type AgriculturalYearState,
} from '../../chronologio/yearPresentation';
import ChronologioThumbnail from './ChronologioThumbnail';

type Props = {
  summary: ChronologioPeriodSummary;
  previous?: ChronologioPeriodSummary;
  numberLocale: string;
  state: AgriculturalYearState;
  onOpen: () => void;
};

const ChronologioClosedYearCard: React.FC<Props> = ({
  summary,
  previous,
  numberLocale,
  state,
  onOpen,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const hero = isRealChronologioMediaUrl(summary.heroMediaUrl) ? summary.heroMediaUrl! : undefined;
  const harvestKey = harvestYearCopyKey(summary);
  const comparison = yearComparison(summary, previous);
  const headline = yearHeadline(summary);
  const badge =
    state === 'awaitingClosure'
      ? t('yearView.awaitingClosure')
      : state === 'upcoming'
        ? t('yearView.upcoming')
        : t('yearView.closed');
  const metrics = yearFixedMetrics(summary, numberLocale, t).filter((metric) => metric.value !== '—');
  const yieldPct =
    summary.oilYieldPercent != null && summary.oilYieldPercent > 0
      ? formatGroveMassKg(summary.oilYieldPercent, numberLocale)
      : null;

  return (
    <article
      id={`chrono-year-${summary.periodYear}`}
      className={`chrono-year-chapter is-closed${hero ? ' has-photo' : ''}`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={t('living.seeYear', { year: summary.periodYear })}
    >
      <div className="chrono-year-chapter-body">
        <header className="chrono-year-chapter-head">
          <div>
            <p className="chrono-year-chapter-kicker">{t('yearView.closedYear')}</p>
            <h2>{summary.periodYear}</h2>
            <p className="chrono-year-range">
              {agriculturalYearRangeLabel(summary.periodYear, i18n.language)}
            </p>
          </div>
          <span className="chrono-year-state-pill is-quiet">{badge}</span>
        </header>

        {harvestKey === 'result' && harvestHasResult(summary) ? (
          <p className="chrono-year-oil-hero">
            {summary.oilKg > 0
              ? `${formatGroveMassKg(summary.oilKg, numberLocale)} ${t('oilUnit')}`
              : `${formatGroveMassKg(summary.oliveKg, numberLocale)} ${t('olivesUnit')}`}
            {yieldPct ? ` · ${t('yearView.yieldFact', { pct: yieldPct })}` : null}
          </p>
        ) : (
          <p className="chrono-year-harvest-copy">
            {harvestKey === 'noResult' ? t('monthView.harvestNoResult') : t('yearView.harvestNotStarted')}
          </p>
        )}

        {metrics.length > 0 ? (
          <ul className="chrono-year-chapter-facts">
            {metrics.map((metric) => (
              <li key={metric.label}>
                {metric.label}: {metric.value}
              </li>
            ))}
          </ul>
        ) : (
          <p className="chrono-year-limited">{t('living.limitedRecords')}</p>
        )}

        {comparison ? (
          <p className="chrono-year-comparison">
            {t(yearComparisonCopyKey(comparison), {
              context: comparison.scope === 'ytd' ? 'ytd' : undefined,
              pct: Math.abs(comparison.percent).toLocaleString(numberLocale),
              year: comparison.previousYear,
            })}
          </p>
        ) : null}

        {headline ? <p className="chrono-year-headline">{headline}</p> : null}
        <button
          type="button"
          className="chrono-year-chapter-hint"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          {t('yearView.openHint')}
        </button>
      </div>
      {hero ? <ChronologioThumbnail src={hero} className="chrono-closed-year-photo" /> : null}
    </article>
  );
};

export default ChronologioClosedYearCard;

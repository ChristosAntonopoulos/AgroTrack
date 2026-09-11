import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ChronologioPeriodSummary } from '../../services/chronologioService';
import { agriculturalYearRangeLabel } from '../../chronologio/agriculturalYear';
import { isRealChronologioMediaUrl } from '../../chronologio/mediaGuard';
import { harvestHasResult } from '../../chronologio/monthPresentation';
import {
  harvestYearCopyKey,
  yearChapterFacts,
  yearComparison,
  yearHeadline,
  type AgriculturalYearState,
} from '../../chronologio/yearPresentation';
import ChronologioThumbnail from './ChronologioThumbnail';
import ChronologioYearFacts from './ChronologioYearFacts';

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

  return (
    <button
      id={`chrono-year-${summary.periodYear}`}
      type="button"
      className={`chrono-year-chapter is-closed${hero ? ' has-photo' : ''}`}
      onClick={onOpen}
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
              ? `${summary.oilKg.toLocaleString(numberLocale, { maximumFractionDigits: 1 })} ${t('oilUnit')}`
              : `${Math.round(summary.oliveKg).toLocaleString(numberLocale)} ${t('olivesUnit')}`}
          </p>
        ) : (
          <p className="chrono-year-harvest-copy">
            {harvestKey === 'noResult' ? t('monthView.harvestNoResult') : t('yearView.harvestNotStarted')}
          </p>
        )}

        {comparison ? (
          <p className="chrono-year-comparison">
            {t(`yearView.compare.${comparison.kind}${comparison.percent >= 0 ? 'Up' : 'Down'}`, {
              pct: Math.abs(comparison.percent),
              year: comparison.previousYear,
            })}
          </p>
        ) : null}

        <ChronologioYearFacts facts={yearChapterFacts(summary)} numberLocale={numberLocale} />

        {headline ? <p className="chrono-year-headline">{headline}</p> : null}
        <span className="chrono-year-chapter-hint">{t('yearView.openHint')}</span>
      </div>
      {hero ? <ChronologioThumbnail src={hero} className="chrono-closed-year-photo" /> : null}
    </button>
  );
};

export default ChronologioClosedYearCard;

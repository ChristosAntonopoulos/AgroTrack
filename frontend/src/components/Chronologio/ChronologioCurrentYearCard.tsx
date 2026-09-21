import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ChronologioPeriodSummary } from '../../services/chronologioService';
import { agriculturalYearRangeLabel } from '../../chronologio/agriculturalYear';
import { harvestHasResult } from '../../chronologio/monthPresentation';
import {
  agriculturalYearState,
  nextSeasonStageIndex,
  SEASON_STAGES,
  seasonStageIndex,
  yearChapterFacts,
  yearHeadline,
} from '../../chronologio/yearPresentation';
import ChronologioSeasonTrack from './ChronologioSeasonTrack';
import ChronologioYearFacts from './ChronologioYearFacts';

type Props = {
  summary: ChronologioPeriodSummary;
  numberLocale: string;
  onOpen: () => void;
};

const ChronologioCurrentYearCard: React.FC<Props> = ({ summary, numberLocale, onOpen }) => {
  const { t, i18n } = useTranslation('chronologio');
  const stage = seasonStageIndex();
  const next = nextSeasonStageIndex(stage);
  const headline = yearHeadline(summary);
  const state = agriculturalYearState(summary.periodYear, summary);
  const harvesting = state === 'harvesting';
  const pill = harvesting ? t('yearView.harvesting') : t('yearView.inProgress');
  const awaitingMill =
    harvesting && summary.harvestCount > 0 && !harvestHasResult(summary);

  return (
    <button
      type="button"
      id={`chrono-year-${summary.periodYear}`}
      className="chrono-year-chapter is-live"
      onClick={onOpen}
    >
      <header className="chrono-year-chapter-head">
        <div>
          <p className="chrono-year-chapter-kicker">{t('yearView.liveYearSoFar')}</p>
          <h2>{summary.periodYear}</h2>
          <p className="chrono-year-range">
            {agriculturalYearRangeLabel(summary.periodYear, i18n.language)}
          </p>
        </div>
        <span className="chrono-year-state-pill">{pill}</span>
      </header>

      {/* Season track stays visual; copy must not contradict an active harvest. */}
      <ChronologioSeasonTrack currentIndex={harvesting ? 3 : stage} />

      <p className="chrono-year-chapter-now">
        {harvesting
          ? t('yearView.harvestingNow', {
              defaultValue: t('yearView.harvesting'),
            })
          : next !== stage
            ? t('yearView.nowReading', {
                stage: t(`yearView.stages.${SEASON_STAGES[stage]}`),
                next: t(`yearView.stages.${SEASON_STAGES[next]}`),
              })
            : t('yearView.nowStage', { stage: t(`yearView.stages.${SEASON_STAGES[stage]}`) })}
      </p>

      {awaitingMill ? (
        <p className="chrono-year-completeness">
          {t('yearView.awaitingMillOil', {
            count: summary.harvestCount,
            defaultValue:
              'Harvest days recorded · mill kilograms and oil still expected',
          })}
        </p>
      ) : null}

      <ChronologioYearFacts facts={yearChapterFacts(summary, true)} numberLocale={numberLocale} />

      {headline ? <p className="chrono-year-headline">{headline}</p> : null}
      <span className="chrono-year-chapter-hint">{t('yearView.openHint')}</span>
    </button>
  );
};

export default ChronologioCurrentYearCard;

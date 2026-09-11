import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ChronologioPeriodSummary } from '../../services/chronologioService';
import { agriculturalYearRangeLabel } from '../../chronologio/agriculturalYear';
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
  const pill = state === 'harvesting' ? t('yearView.harvesting') : t('yearView.inProgress');

  return (
    <button
      type="button"
      id={`chrono-year-${summary.periodYear}`}
      className="chrono-year-chapter is-live"
      onClick={onOpen}
    >
      <header className="chrono-year-chapter-head">
        <div>
          <p className="chrono-year-chapter-kicker">{t('yearView.liveYear')}</p>
          <h2>{summary.periodYear}</h2>
          <p className="chrono-year-range">
            {agriculturalYearRangeLabel(summary.periodYear, i18n.language)}
          </p>
        </div>
        <span className="chrono-year-state-pill">{pill}</span>
      </header>

      <ChronologioSeasonTrack currentIndex={stage} />

      <p className="chrono-year-chapter-now">
        {next !== stage
          ? t('yearView.nowReading', {
              stage: t(`yearView.stages.${SEASON_STAGES[stage]}`),
              next: t(`yearView.stages.${SEASON_STAGES[next]}`),
            })
          : t('yearView.nowStage', { stage: t(`yearView.stages.${SEASON_STAGES[stage]}`) })}
      </p>

      <ChronologioYearFacts facts={yearChapterFacts(summary, true)} numberLocale={numberLocale} />

      {headline ? <p className="chrono-year-headline">{headline}</p> : null}
      <span className="chrono-year-chapter-hint">{t('yearView.openHint')}</span>
    </button>
  );
};

export default ChronologioCurrentYearCard;

import React from 'react';
import { useTranslation } from 'react-i18next';
import { SEASON_STAGES, seasonTrackFill } from '../../chronologio/yearPresentation';

type Props = {
  currentIndex: number;
  complete?: boolean;
};

const ChronologioSeasonTrack: React.FC<Props> = ({ currentIndex, complete }) => {
  const { t } = useTranslation('chronologio');
  const stage = SEASON_STAGES[Math.min(SEASON_STAGES.length - 1, Math.max(0, currentIndex))];
  const fill = seasonTrackFill(currentIndex, complete) * 100;

  return (
    <div
      className={`chrono-season-track${complete ? ' is-complete' : ''}`}
      role="progressbar"
      aria-label={t('yearView.progressLabel')}
      aria-valuemin={1}
      aria-valuemax={SEASON_STAGES.length}
      aria-valuenow={complete ? SEASON_STAGES.length : currentIndex + 1}
      aria-valuetext={
        complete
          ? t('yearView.trackComplete')
          : t('yearView.stageOf', {
              stage: t(`yearView.stages.${stage}`),
              current: currentIndex + 1,
              total: SEASON_STAGES.length,
            })
      }
    >
      <div className="chrono-season-track-bar" aria-hidden>
        <span className="chrono-season-track-fill" style={{ width: `${fill}%` }} />
        {SEASON_STAGES.map((key, index) => (
          <i
            key={key}
            className={
              complete || index < currentIndex
                ? 'is-done'
                : index === currentIndex
                  ? 'is-now'
                  : undefined
            }
            style={{ left: `${((index + 0.5) / SEASON_STAGES.length) * 100}%` }}
          />
        ))}
      </div>
      <ol>
        {SEASON_STAGES.map((key, index) => (
          <li
            key={key}
            className={
              complete || index < currentIndex
                ? 'is-done'
                : index === currentIndex
                  ? 'is-now'
                  : undefined
            }
          >
            <span>{t(`yearView.stages.${key}`)}</span>
            {!complete && index === currentIndex ? <em>{t('yearView.here')}</em> : null}
          </li>
        ))}
      </ol>
    </div>
  );
};

export default ChronologioSeasonTrack;

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { seasonStageIndex } from '../../chronologio/yearPresentation';
import { HARVEST_YEAR_STAGES, harvestYearSpan, harvestYearStatus } from '../../finance/harvestYear';
import './Money.css';

type Props = {
  year: number;
  yearRangeLabel?: string;
  onYearChange: (year: number) => void;
};

const MoneyContextBar: React.FC<Props> = ({ year, yearRangeLabel, onYearChange }) => {
  const { t } = useTranslation('money');
  const status = harvestYearStatus(year);
  const statusKey =
    status === 'current'
      ? 'harvestYearCurrent'
      : status === 'closed'
        ? 'harvestYearClosed'
        : 'harvestYearUpcoming';
  const liveIndex = status === 'current' ? seasonStageIndex() : -1;
  const liveStage = liveIndex >= 0 ? HARVEST_YEAR_STAGES[liveIndex] : null;

  return (
    <div className="money-toolbar">
      <div className="money-year-tabs" role="group" aria-label={t('yearAria')}>
        <button type="button" aria-label={t('prevYear')} onClick={() => onYearChange(year - 1)}>
          <ChevronLeft size={20} />
        </button>
        <div className="money-year-label">
          <span className="money-year-kicker">{t('harvestYearName')}</span>
          <strong aria-live="polite">
            {harvestYearSpan(year)}
            <em className={`money-year-status is-${status}`}>{t(statusKey)}</em>
          </strong>
          {yearRangeLabel ? <span className="money-year-range">{yearRangeLabel}</span> : null}
          {liveStage ? (
            <span className="money-season-now">
              <span className="money-season-track" aria-hidden>
                {HARVEST_YEAR_STAGES.map((stage, index) => (
                  <i
                    key={stage}
                    className={index < liveIndex ? 'is-past' : index === liveIndex ? 'is-now' : ''}
                  />
                ))}
              </span>
              {t(`seasonLine.${liveStage}`)}
            </span>
          ) : null}
        </div>
        <button type="button" aria-label={t('nextYear')} onClick={() => onYearChange(year + 1)}>
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default MoneyContextBar;

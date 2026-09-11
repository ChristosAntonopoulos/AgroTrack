import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChronologioPeriodSummary } from '../../services/chronologioService';
import { agriculturalYearFor } from '../../chronologio/agriculturalYear';
import {
  agriculturalYearState,
  ensureCurrentAgriculturalYear,
  isFinishedHistoricalYear,
  previousYearSummary,
} from '../../chronologio/yearPresentation';
import ChronologioCurrentYearCard from './ChronologioCurrentYearCard';
import ChronologioClosedYearCard from './ChronologioClosedYearCard';

type Props = {
  summaries: ChronologioPeriodSummary[];
  numberLocale: string;
  onOpenYear: (periodYear: number) => void;
};

const ChronologioYearsView: React.FC<Props> = ({ summaries, numberLocale, onOpenYear }) => {
  const { t } = useTranslation('chronologio');
  const currentAgri = useMemo(() => agriculturalYearFor(new Date()), []);
  const years = useMemo(() => ensureCurrentAgriculturalYear(summaries), [summaries]);

  return (
    <div className="chrono-years chrono-years-feed">
      {years.map((row) => {
        const isLive = row.periodYear === currentAgri;
        const state = agriculturalYearState(row.periodYear, row);
        if (!isLive && !isFinishedHistoricalYear(state) && state !== 'upcoming') return null;
        if (isLive) {
          return (
            <ChronologioCurrentYearCard
              key={row.key || row.periodYear}
              summary={row}
              numberLocale={numberLocale}
              onOpen={() => onOpenYear(row.periodYear)}
            />
          );
        }
        return (
          <ChronologioClosedYearCard
            key={row.key || row.periodYear}
            summary={row}
            previous={previousYearSummary(years, row.periodYear)}
            numberLocale={numberLocale}
            state={state}
            onOpen={() => onOpenYear(row.periodYear)}
          />
        );
      })}
      <p className="chrono-years-origin">{t('living.historyStartsHere')}</p>
    </div>
  );
};

export default ChronologioYearsView;

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChronologioPeriodSummary } from '../../services/chronologioService';
import { focusDateForPeriod } from '../../chronologio/livingTypes';
import type { ChronologioAxis } from '../../services/chronologioService';
import type { ChronologioZoom } from '../../chronologio/livingTypes';

type Props = {
  summaries: ChronologioPeriodSummary[];
  activePeriodYear: number;
  axis: ChronologioAxis;
  zoom: ChronologioZoom;
  onScrollToYear: (periodYear: number) => void;
  onJumpToYear: (isoDate: string) => void;
};

/** Desktop years navigator — sticky, ≥5 years only. */
const ChronologioDateRail: React.FC<Props> = ({
  summaries,
  activePeriodYear,
  axis,
  zoom,
  onScrollToYear,
  onJumpToYear,
}) => {
  const { t } = useTranslation('chronologio');
  const years = useMemo(
    () => [...summaries].sort((a, b) => b.periodYear - a.periodYear),
    [summaries]
  );

  if (years.length < 5) return null;

  return (
    <nav className="chrono-date-rail" aria-label={t('living.dateRail')}>
      <ul>
        {years.map((y) => {
          const active = y.periodYear === activePeriodYear;
          return (
            <li key={y.key}>
              <button
                type="button"
                className={`chrono-rail-item${active ? ' is-active' : ''}`}
                onClick={() => {
                  if (zoom === 'years') {
                    onScrollToYear(y.periodYear);
                  } else {
                    onJumpToYear(focusDateForPeriod(y.periodYear, axis));
                  }
                }}
                title={String(y.periodYear)}
                aria-current={active ? 'true' : undefined}
              >
                <span className="chrono-rail-dot" aria-hidden />
                <span className="chrono-rail-label">{y.periodYear}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default ChronologioDateRail;

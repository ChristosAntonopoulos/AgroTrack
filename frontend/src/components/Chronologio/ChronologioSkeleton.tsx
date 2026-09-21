import React from 'react';
import type { ChronologioZoom } from '../../chronologio/livingTypes';
import './Chronologio.css';

type Props = {
  zoom?: ChronologioZoom;
};

/** First-load placeholders shaped like the active time scale. */
const ChronologioSkeleton: React.FC<Props> = ({ zoom = 'month' }) => {
  if (zoom === 'years') {
    return (
      <div className="chronologio-skeleton chronologio-skeleton--years" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="chronologio-skeleton-year-card" />
        ))}
      </div>
    );
  }

  if (zoom === 'year') {
    return (
      <div className="chronologio-skeleton chronologio-skeleton--months" aria-hidden>
        <div className="chronologio-skeleton-track" />
        {[0, 1].map((i) => (
          <div key={i} className="chronologio-skeleton-month-block">
            <div className="chronologio-skeleton-month-head" />
            <div className="chronologio-skeleton-card" />
            <div className="chronologio-skeleton-card" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="chronologio-skeleton chronologio-skeleton--days" aria-hidden>
      {[0, 1, 2].map((group) => (
        <div key={group} className="chronologio-skeleton-day-group">
          <div className="chronologio-skeleton-day-head" />
          {[0, 1].map((i) => (
            <div key={i} className="chronologio-skeleton-row">
              <div className="chronologio-skeleton-dot" />
              <div className="chronologio-skeleton-card" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default ChronologioSkeleton;

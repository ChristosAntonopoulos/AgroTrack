import React from 'react';
import './Chronologio.css';

const ChronologioSkeleton: React.FC = () => (
  <div className="chronologio-skeleton" aria-hidden>
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="chronologio-skeleton-row">
        <div className="chronologio-skeleton-dot" />
        <div className="chronologio-skeleton-card" />
      </div>
    ))}
  </div>
);

export default ChronologioSkeleton;

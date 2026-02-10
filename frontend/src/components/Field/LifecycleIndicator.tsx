import React from 'react';
import './LifecycleIndicator.css';

interface LifecycleIndicatorProps {
  year: 'low' | 'high' | string;
  showLabel?: boolean;
}

const LifecycleIndicator: React.FC<LifecycleIndicatorProps> = ({ year, showLabel = true }) => {
  const isLow = year.toLowerCase() === 'low';
  const isHigh = year.toLowerCase() === 'high';

  return (
    <div className="lifecycle-indicator">
      <div className={`lifecycle-badge ${isLow ? 'low' : 'high'}`}>
        <span className="lifecycle-dot"></span>
        {showLabel && <span className="lifecycle-label">{isLow ? 'Low Year' : 'High Year'}</span>}
      </div>
    </div>
  );
};

export default LifecycleIndicator;

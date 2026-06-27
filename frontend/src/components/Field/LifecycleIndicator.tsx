import React from 'react';
import { useTranslation } from 'react-i18next';
import './LifecycleIndicator.css';

interface LifecycleIndicatorProps {
  year: 'low' | 'high' | string;
  stage?: string;
  showLabel?: boolean;
}

const LifecycleIndicator: React.FC<LifecycleIndicatorProps> = ({ year, stage, showLabel = true }) => {
  const { t } = useTranslation('common');
  const isLow = year.toLowerCase() === 'low';
  const stageKey = stage || 'dormancy';
  const stageLabel = t(`lifecycleStage.${stageKey}`, { defaultValue: stageKey });

  return (
    <div className="lifecycle-indicator">
      <div className={`lifecycle-badge ${isLow ? 'low' : 'high'}`}>
        <span className="lifecycle-dot"></span>
        {showLabel && (
          <span className="lifecycle-label">
            {isLow ? t('lifecycleYear.low') : t('lifecycleYear.high')}
            {stage ? ` · ${stageLabel}` : ''}
          </span>
        )}
      </div>
    </div>
  );
};

export default LifecycleIndicator;

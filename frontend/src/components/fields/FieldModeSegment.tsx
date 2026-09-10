import React from 'react';
import { useTranslation } from 'react-i18next';
import { useExperienceMode } from '../../context/ExperienceModeContext';
import type { ExperienceMode } from '../../experience/types';
import './FieldPageShell.css';

const FieldModeSegment: React.FC = () => {
  const { t } = useTranslation('fields');
  const { experienceMode, setExperienceMode } = useExperienceMode();

  const select = (mode: ExperienceMode) => {
    if (mode === experienceMode) return;
    setExperienceMode(mode);
  };

  return (
    <div className="field-mode-segment" role="group" aria-label={t('page.modeAria')}>
      <button
        type="button"
        className={experienceMode === 'everyday' ? 'is-active' : undefined}
        aria-pressed={experienceMode === 'everyday'}
        onClick={() => select('everyday')}
      >
        {t('page.simple')}
      </button>
      <button
        type="button"
        className={experienceMode === 'full' ? 'is-active' : undefined}
        aria-pressed={experienceMode === 'full'}
        onClick={() => select('full')}
      >
        {t('page.full')}
      </button>
    </div>
  );
};

export default FieldModeSegment;

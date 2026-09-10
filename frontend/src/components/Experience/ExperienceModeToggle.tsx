import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layers, ListChecks } from 'lucide-react';
import { useExperienceMode } from '../../context/ExperienceModeContext';
import { isEverydayAllowedPath } from '../../experience/catalog';
import type { ExperienceMode } from '../../experience/types';
import './ExperienceModeToggle.css';

interface ExperienceModeToggleProps {
  compact?: boolean;
  onChanged?: () => void;
}

const ExperienceModeToggle: React.FC<ExperienceModeToggleProps> = ({ compact = false, onChanged }) => {
  const { t } = useTranslation('settings');
  const { experienceMode, setExperienceMode } = useExperienceMode();
  const navigate = useNavigate();
  const location = useLocation();

  const select = (mode: ExperienceMode) => {
    if (mode === experienceMode) return;
    setExperienceMode(mode);
    if (mode === 'everyday' && !isEverydayAllowedPath(location.pathname)) {
      navigate('/today');
    }
    onChanged?.();
  };

  return (
    <div
      className={`experience-mode-toggle ${compact ? 'experience-mode-toggle-compact' : ''}`}
      role="group"
      aria-label={t('experience.label')}
    >
      <button
        type="button"
        className={`experience-mode-btn experience-mode-btn-everyday ${experienceMode === 'everyday' ? 'active' : ''}`}
        onClick={() => select('everyday')}
        aria-pressed={experienceMode === 'everyday'}
        title={t('experience.everyday')}
      >
        {!compact && <ListChecks size={18} aria-hidden />}
        <span className={compact ? 'experience-mode-btn-short' : undefined}>
          {compact ? t('experience.everydayShort') : t('experience.everyday')}
        </span>
      </button>
      <button
        type="button"
        className={`experience-mode-btn experience-mode-btn-full ${experienceMode === 'full' ? 'active' : ''}`}
        onClick={() => select('full')}
        aria-pressed={experienceMode === 'full'}
        title={t('experience.full')}
      >
        {!compact && <Layers size={18} aria-hidden />}
        <span className={compact ? 'experience-mode-btn-short' : undefined}>
          {compact ? t('experience.fullShort') : t('experience.full')}
        </span>
      </button>
    </div>
  );
};

export default ExperienceModeToggle;

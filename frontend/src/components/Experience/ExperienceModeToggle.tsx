import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, ListChecks } from 'lucide-react';
import { useExperienceMode } from '../../context/ExperienceModeContext';
import type { ExperienceMode } from '../../experience/types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './ExperienceModeToggle.css';

interface ExperienceModeToggleProps {
  compact?: boolean;
}

const ExperienceModeToggle: React.FC<ExperienceModeToggleProps> = ({ compact = false }) => {
  const { t } = useTranslation('settings');
  const { experienceMode, setExperienceMode, rehomePathForMode } = useExperienceMode();
  const { user } = useAuth();
  const navigate = useNavigate();

  const select = (mode: ExperienceMode) => {
    setExperienceMode(mode);
    navigate(rehomePathForMode(mode, user?.role), { replace: false });
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
        <ListChecks size={compact ? 16 : 18} aria-hidden />
        {!compact && <span>{t('experience.everyday')}</span>}
        {compact && <span className="experience-mode-btn-short">{t('experience.everydayShort')}</span>}
      </button>
      <button
        type="button"
        className={`experience-mode-btn experience-mode-btn-full ${experienceMode === 'full' ? 'active' : ''}`}
        onClick={() => select('full')}
        aria-pressed={experienceMode === 'full'}
        title={t('experience.full')}
      >
        <Layers size={compact ? 16 : 18} aria-hidden />
        {!compact && <span>{t('experience.full')}</span>}
        {compact && <span className="experience-mode-btn-short">{t('experience.fullShort')}</span>}
      </button>
    </div>
  );
};

export default ExperienceModeToggle;

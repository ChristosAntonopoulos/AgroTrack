import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Layers, ListChecks } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useExperienceMode } from '../context/ExperienceModeContext';
import type { ExperienceMode } from '../experience/types';
import { roleHomePath, AppRole } from '../navigation/navConfig';
import BrandLogo from '../components/Common/BrandLogo';
import './ExperienceChooserPage.css';

const ExperienceChooserPage: React.FC = () => {
  const { t } = useTranslation('settings');
  const { user } = useAuth();
  const { chooseExperienceMode } = useExperienceMode();
  const navigate = useNavigate();

  const finish = (mode: ExperienceMode) => {
    chooseExperienceMode(mode);
    navigate(roleHomePath((user?.role || '') as AppRole, mode), { replace: true });
  };

  return (
    <div className="experience-chooser">
      <div className="experience-chooser-card">
        <BrandLogo size="md" />
        <h1>{t('experience.chooserTitle')}</h1>
        <p className="experience-chooser-subtitle">{t('experience.chooserSubtitle')}</p>

        <div className="experience-chooser-options">
          <button
            type="button"
            className="experience-option experience-option-everyday"
            onClick={() => finish('everyday')}
          >
            <span className="experience-option-band">
              <span className="experience-option-icon" aria-hidden>
                <ListChecks size={22} />
              </span>
              <span className="experience-option-title">{t('experience.everyday')}</span>
            </span>
            <span className="experience-option-body">
              <span className="experience-option-desc">{t('experience.everydayDesc')}</span>
              <span className="experience-option-hint">
                <CheckCircle2 size={16} aria-hidden />
                {t('experience.everydayHint')}
              </span>
            </span>
          </button>

          <button
            type="button"
            className="experience-option experience-option-full"
            onClick={() => finish('full')}
          >
            <span className="experience-option-band">
              <span className="experience-option-icon" aria-hidden>
                <Layers size={22} />
              </span>
              <span className="experience-option-title">{t('experience.full')}</span>
            </span>
            <span className="experience-option-body">
              <span className="experience-option-desc">{t('experience.fullDesc')}</span>
              <span className="experience-option-hint">
                <Layers size={16} aria-hidden />
                {t('experience.fullHint')}
              </span>
            </span>
          </button>
        </div>

        <p className="experience-chooser-footer">{t('experience.chooserFooter')}</p>
      </div>
    </div>
  );
};

export default ExperienceChooserPage;

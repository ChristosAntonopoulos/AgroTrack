import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Layers, ListChecks, Type } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useExperienceMode } from '../context/ExperienceModeContext';
import type { ExperienceMode, FontScale } from '../experience/types';
import { defaultExperienceModeForRole } from '../experience/defaults';
import BrandLogo from '../components/Common/BrandLogo';
import './ExperienceChooserPage.css';

const ExperienceChooserPage: React.FC = () => {
  const { t } = useTranslation('settings');
  const { user } = useAuth();
  const { chooseExperienceMode, setFontScale, fontScale, rehomePathForMode } = useExperienceMode();
  const navigate = useNavigate();
  const recommended = defaultExperienceModeForRole(user?.role);
  const [step, setStep] = useState<'mode' | 'comfort'>('mode');
  const [pendingMode, setPendingMode] = useState<ExperienceMode | null>(null);

  const pickMode = (mode: ExperienceMode) => {
    setPendingMode(mode);
    setStep('comfort');
  };

  const finish = (scale: FontScale = fontScale) => {
    const mode = pendingMode || recommended;
    setFontScale(scale);
    chooseExperienceMode(mode);
    navigate(rehomePathForMode(mode, user?.role), { replace: true });
  };

  return (
    <div className="experience-chooser">
      <div className="experience-chooser-card">
        <BrandLogo variant="horizontal" size="md" alt="Oleachron" />
        {step === 'mode' ? (
          <>
            <h1>{t('experience.chooserTitle')}</h1>
            <p className="experience-chooser-subtitle">{t('experience.chooserSubtitle')}</p>
            <div className="experience-chooser-options">
              <button
                type="button"
                className={`experience-option experience-option-everyday ${recommended === 'everyday' ? 'recommended' : ''}`}
                onClick={() => pickMode('everyday')}
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
                className={`experience-option experience-option-full ${recommended === 'full' ? 'recommended' : ''}`}
                onClick={() => pickMode('full')}
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
          </>
        ) : (
          <>
            <h1>{t('experience.comfortTitle')}</h1>
            <p className="experience-chooser-subtitle">{t('experience.comfortSubtitle')}</p>
            <div className="experience-comfort-options">
              {(['default', 'large', 'xl'] as FontScale[]).map((scale) => (
                <button
                  key={scale}
                  type="button"
                  className="experience-comfort-btn"
                  onClick={() => finish(scale)}
                >
                  <Type size={18} aria-hidden />
                  {t(`preferences.fontScales.${scale}`)}
                </button>
              ))}
            </div>
            <button type="button" className="experience-chooser-skip" onClick={() => finish()}>
              {t('experience.comfortSkip')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ExperienceChooserPage;

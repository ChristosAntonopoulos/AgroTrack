import React from 'react';
import { useTranslation } from 'react-i18next';
import { useExperienceMode } from '../../context/ExperienceModeContext';
import './FullPictureOnramp.css';

const FullPictureOnramp: React.FC = () => {
  const { t } = useTranslation('settings');
  const {
    shouldShowFullPictureOnramp,
    setExperienceMode,
    dismissFullPictureOnramp,
  } = useExperienceMode();

  if (!shouldShowFullPictureOnramp) return null;

  return (
    <div className="full-picture-onramp" role="status">
      <div className="full-picture-onramp-body">
        <strong>{t('experience.onrampTitle')}</strong>
        <p>{t('experience.onrampBody')}</p>
      </div>
      <div className="full-picture-onramp-actions">
        <button
          type="button"
          className="full-picture-onramp-primary"
          onClick={() => {
            setExperienceMode('full');
            dismissFullPictureOnramp();
          }}
        >
          {t('experience.onrampSwitch')}
        </button>
        <button type="button" className="full-picture-onramp-secondary" onClick={dismissFullPictureOnramp}>
          {t('experience.onrampDismiss')}
        </button>
      </div>
    </div>
  );
};

export default FullPictureOnramp;

import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import './HarvestOpening.css';

type Props = {
  seasonLabel?: string;
  onClose: () => void;
};

const HarvestOpening: React.FC<Props> = ({ seasonLabel, onClose }) => {
  const { t } = useTranslation('fields');
  const titleId = useId();
  const bodyId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    buttonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="hc-opening">
      <div className="hc-opening-veil" />
      <div
        className="hc-opening-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
      >
        {seasonLabel ? <p className="hc-opening-kicker">{seasonLabel}</p> : null}
        <h2 id={titleId}>{t('harvestCampaign.opening.title')}</h2>
        <div id={bodyId} className="hc-opening-copy">
          <p>{t('harvestCampaign.opening.body')}</p>
          <p>{t('harvestCampaign.opening.story')}</p>
        </div>
        <p className="hc-opening-promise">
          <span>{t('harvestCampaign.opening.promiseKeep')}</span>
          <span>{t('harvestCampaign.opening.promiseYours')}</span>
        </p>
        <p className="hc-opening-blessing">{t('harvestCampaign.opening.blessing')}</p>
        <button ref={buttonRef} type="button" className="hc-opening-go" onClick={onClose}>
          {t('harvestCampaign.opening.cta')}
        </button>
      </div>
    </div>,
    document.body
  );
};

export default HarvestOpening;

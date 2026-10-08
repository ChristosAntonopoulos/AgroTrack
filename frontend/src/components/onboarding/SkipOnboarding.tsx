import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { SkipForward } from 'lucide-react';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';
import './SkipOnboarding.css';

/** Small corner control. Skipping asks first, then leaves the guided setup. */
const SkipOnboarding: React.FC = () => {
  const activation = useOwnerActivationOptional();
  const { t } = useTranslation('onboarding');
  const [open, setOpen] = useState(false);

  const guiding = Boolean(
    activation && !activation.laterSnoozed && (activation.visible || activation.guideBeat)
  );

  useEffect(() => {
    if (guiding) return;
    setOpen(false);
  }, [guiding]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!activation || !guiding) return null;

  const confirm = () => {
    setOpen(false);
    activation.dismiss();
  };

  return (
    <>
      <button
        type="button"
        className="skip-onboarding-btn"
        onClick={() => setOpen(true)}
        aria-label={t('skipConfirm.label')}
        title={t('skipConfirm.label')}
      >
        <SkipForward size={15} strokeWidth={2.25} aria-hidden />
      </button>
      {open
        ? createPortal(
            <div className="skip-onboarding-dialog" role="presentation">
              <button
                type="button"
                className="skip-onboarding-backdrop"
                aria-label={t('skipConfirm.stay')}
                onClick={() => setOpen(false)}
              />
              <div
                className="skip-onboarding-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="skip-onboarding-title"
              >
                <p className="skip-onboarding-kicker">{t('skipConfirm.label')}</p>
                <h2 id="skip-onboarding-title">{t('skipConfirm.title')}</h2>
                <p>{t('skipConfirm.body')}</p>
                <div className="skip-onboarding-actions">
                  <button type="button" className="skip-onboarding-confirm" onClick={confirm}>
                    {t('skipConfirm.confirm')}
                  </button>
                  <button type="button" className="skip-onboarding-stay" onClick={() => setOpen(false)}>
                    {t('skipConfirm.stay')}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export default SkipOnboarding;

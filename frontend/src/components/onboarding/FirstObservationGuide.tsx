import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { StickyNote } from 'lucide-react';
import { useCaptureOptional } from '../../context/CaptureContext';
import { useOwnerActivation } from '../../onboarding/OwnerActivationContext';
import { ONBOARDING_TARGETS } from '../../onboarding/steps';
import { CAPTURE_SAVED_EVENT, type CaptureSavedDetail } from '../../capture/types';
import './FirstObservationGuide.css';

type Props = {
  fieldId: string;
};

/**
 * First History note — mandatory until saved. Capture opens for them.
 */
const FirstObservationGuide: React.FC<Props> = ({ fieldId }) => {
  const { t } = useTranslation('onboarding');
  const navigate = useNavigate();
  const capture = useCaptureOptional();
  const {
    awaitingFirstObservation,
    completion,
    completeFirstObservation,
  } = useOwnerActivation();

  const active = awaitingFirstObservation && !completion.firstObservation;
  const captureOpen = Boolean(capture?.isOpen);

  const finish = React.useCallback(() => {
    completeFirstObservation();
    navigate(`/chronologio?fieldId=${encodeURIComponent(fieldId)}`, { replace: true });
  }, [completeFirstObservation, fieldId, navigate]);

  const openObservation = React.useCallback(() => {
    capture?.openCapture({
      fieldId,
      preferredType: 'observation',
      description: t('firstObservation.prefill'),
    });
  }, [capture, fieldId, t]);

  useEffect(() => {
    if (!active || captureOpen) return;
    openObservation();
  }, [active, captureOpen, openObservation]);

  useEffect(() => {
    if (!active) return;
    const onSaved = (event: Event) => {
      const detail = (event as CustomEvent<CaptureSavedDetail>).detail;
      if (detail?.type !== 'observation') return;
      if (detail.fieldId && detail.fieldId !== fieldId) return;
      finish();
    };
    window.addEventListener(CAPTURE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(CAPTURE_SAVED_EVENT, onSaved);
  }, [active, fieldId, finish]);

  if (!active || captureOpen) return null;

  return createPortal(
    <div className="first-observation-lock" role="dialog" aria-modal="true" aria-label={t('firstObservation.title')}>
      <div className="first-observation-lock-dim" aria-hidden />
      <aside
        className="first-observation-guide is-mandatory"
        data-onboarding-target={ONBOARDING_TARGETS.firstObservation}
      >
        <span className="first-observation-guide-icon" aria-hidden>
          <StickyNote size={20} strokeWidth={1.75} />
        </span>
        <div className="first-observation-guide-copy">
          <strong>{t('firstObservation.title')}</strong>
          <p>{t('firstObservation.body')}</p>
        </div>
        <div className="first-observation-guide-actions">
          <button type="button" className="first-observation-guide-primary" onClick={openObservation}>
            {t('firstObservation.cta')}
          </button>
        </div>
      </aside>
    </div>,
    document.body
  );
};

export default FirstObservationGuide;

import React, { useEffect, useRef } from 'react';
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
 * Mandatory first Chronologio note on καρτέλα: sticky guide at top,
 * opens a prefilled observation, completes only after save.
 */
const FirstObservationGuide: React.FC<Props> = ({ fieldId }) => {
  const { t } = useTranslation('onboarding');
  const navigate = useNavigate();
  const capture = useCaptureOptional();
  const autoOpened = useRef(false);
  const {
    awaitingFirstObservation,
    completion,
    completeFirstObservation,
  } = useOwnerActivation();

  const active = awaitingFirstObservation && !completion.firstObservation;

  const finish = React.useCallback(() => {
    completeFirstObservation();
    navigate(`/fields/${fieldId}?tab=chronologio`, { replace: true });
  }, [completeFirstObservation, fieldId, navigate]);

  const openObservation = React.useCallback(() => {
    capture?.openCapture({
      fieldId,
      preferredType: 'observation',
      description: t('firstObservation.prefill'),
    });
  }, [capture, fieldId, t]);

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

  // Soft open capture once so the grower lands on σημείωση with prefill ready.
  useEffect(() => {
    if (!active || autoOpened.current) return;
    autoOpened.current = true;
    const id = window.setTimeout(() => openObservation(), 700);
    return () => window.clearTimeout(id);
  }, [active, openObservation]);

  if (!active) return null;

  return (
    <aside
      className="first-observation-guide is-mandatory"
      role="region"
      aria-label={t('firstObservation.title')}
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
  );
};

export default FirstObservationGuide;

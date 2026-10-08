import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { useOwnerActivation } from '../../onboarding/OwnerActivationContext';
import { canVisitActivationStep } from '../../onboarding/evaluate';
import { OWNER_CHECKLIST_STEPS, type OwnerActivationStepId } from '../../onboarding/steps';
import './ActivationChecklist.css';

/** Top path: the current step is the filled pill. The cue under the control says what to do. */
const ActivationChecklist: React.FC = () => {
  const { t } = useTranslation('onboarding');
  const {
    visible,
    celebrating,
    completion,
    activeStep,
    laterSnoozed,
    setupUnlocked,
    goToStep,
    clearCelebration,
  } = useOwnerActivation();

  if (!visible) return null;

  const resumeStep = activeStep || (completion.createGrove ? 'drawBoundary' : 'createGrove');

  if (celebrating) {
    return (
      <aside className="activation-bar activation-bar--celebrate" aria-live="polite">
        <div className="activation-bar-inner">
          <div className="activation-bar-copy">
            <strong>{t('checklist.celebrateTitle')}</strong>
            <span>{t('checklist.celebrateBody')}</span>
          </div>
          <button type="button" className="activation-bar-primary" onClick={clearCelebration}>
            {t('checklist.dismiss')}
          </button>
        </div>
      </aside>
    );
  }

  if (laterSnoozed && !setupUnlocked) {
    return (
      <aside className="activation-bar activation-bar--snoozed" aria-label={t('checklist.title')}>
        <div className="activation-bar-inner">
          <div className="activation-bar-copy">
            <strong>{t('checklist.continueTitle')}</strong>
            <span>{t('checklist.continueBody')}</span>
          </div>
          <button
            type="button"
            className="activation-bar-primary"
            onClick={() => goToStep(resumeStep === 'firstObservation' ? 'loadData' : resumeStep)}
          >
            {t('checklist.continueCta')}
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="activation-bar" aria-label={t('checklist.title')}>
      <div className="activation-bar-inner">
        <nav className="activation-bar-steps" aria-label={t('checklist.title')}>
          {OWNER_CHECKLIST_STEPS.map((step: OwnerActivationStepId, index) => {
            const done = completion[step];
            const current = activeStep === step;
            const visit = canVisitActivationStep(step, completion);
            return (
              <button
                key={step}
                type="button"
                className={`activation-bar-step${done ? ' is-done' : ''}${current ? ' is-current' : ''}${!visit ? ' is-disabled' : ''}`}
                onClick={() => visit && goToStep(step)}
                disabled={!visit}
                aria-current={current ? 'step' : undefined}
                aria-disabled={!visit}
                aria-label={t(`steps.${step}.title`)}
              >
                <span className="activation-bar-step-num" aria-hidden>
                  {done ? <Check size={14} strokeWidth={2.5} /> : index + 1}
                </span>
                <span className="activation-bar-step-label">{t(`checklist.short.${step}`)}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default ActivationChecklist;

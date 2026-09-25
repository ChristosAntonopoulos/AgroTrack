import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useOwnerActivation } from '../../onboarding/OwnerActivationContext';
import { canVisitActivationStep } from '../../onboarding/evaluate';
import { OWNER_CHECKLIST_STEPS, type OwnerActivationStepId } from '../../onboarding/steps';
import './ActivationChecklist.css';

const tipKeyFor = (
  step: OwnerActivationStepId | null,
  boundaryLocate: boolean
): 'createGrove' | 'locatePlace' | 'drawBoundary' | null => {
  if (!step) return null;
  if (step === 'createGrove') return 'createGrove';
  if (step === 'drawBoundary') return boundaryLocate ? 'locatePlace' : 'drawBoundary';
  return null;
};

const readBoundaryLocate = (): boolean => {
  const root = document.querySelector('[data-onboarding-boundary-phase]');
  const phase = root?.getAttribute('data-onboarding-boundary-phase');
  const located = root?.getAttribute('data-onboarding-located') === 'true';
  if (phase === 'locate' && !located) return true;
  if (!located && phase !== 'drawing' && phase !== 'done') return true;
  return false;
};

/** Top horizontal setup bar — steps + tip; Later snoozes hard lock until όρια. */
const ActivationChecklist: React.FC = () => {
  const { t } = useTranslation('onboarding');
  const {
    visible,
    celebrating,
    checklistCollapsed,
    completion,
    activeStep,
    spotlightStep,
    locked,
    laterSnoozed,
    setupUnlocked,
    setCollapsed,
    goToStep,
    skipStep,
    snoozeLater,
    clearCelebration,
  } = useOwnerActivation();

  const [boundaryLocate, setBoundaryLocate] = React.useState(readBoundaryLocate);

  React.useEffect(() => {
    if (!spotlightStep || spotlightStep !== 'drawBoundary') return;
    const id = window.setInterval(() => setBoundaryLocate(readBoundaryLocate()), 400);
    return () => window.clearInterval(id);
  }, [spotlightStep]);

  if (!visible) return null;

  const total = OWNER_CHECKLIST_STEPS.length;
  // Inline FocusSpotlight already coaches on create/boundary — avoid a second tip while locked.
  const tipKey =
    locked && (spotlightStep === 'createGrove' || spotlightStep === 'drawBoundary')
      ? null
      : tipKeyFor(spotlightStep, boundaryLocate);
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
    <aside
      className={`activation-bar${checklistCollapsed ? ' is-collapsed' : ''}${locked ? ' is-locked' : ''}`}
      aria-label={t('checklist.title')}
    >
      <div className="activation-bar-inner">
        <div className="activation-bar-brand">
          <strong>{t('checklist.title')}</strong>
          <span>
            {t('checklist.progress', {
              done: OWNER_CHECKLIST_STEPS.filter((s) => completion[s]).length,
              total,
            })}
          </span>
        </div>

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
                title={t(`steps.${step}.title`)}
              >
                <span className="activation-bar-step-num" aria-hidden>
                  {done ? <Check size={14} strokeWidth={2.5} /> : index + 1}
                </span>
                <span className="activation-bar-step-label">{t(`steps.${step}.title`)}</span>
              </button>
            );
          })}
        </nav>

        {!checklistCollapsed && tipKey ? (
          <div className="activation-bar-tip">
            <div className="activation-bar-tip-copy">
              <strong>{t(`spotlight.${tipKey}.title`)}</strong>
              <span>{t(`spotlight.${tipKey}.body`)}</span>
            </div>
            {setupUnlocked && tipKey !== 'createGrove' ? (
              <button
                type="button"
                className="activation-bar-skip"
                onClick={() => (spotlightStep ? skipStep(spotlightStep) : snoozeLater())}
              >
                {t('spotlight.skip')}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="activation-bar-actions">
          <button
            type="button"
            className="activation-bar-icon-btn"
            onClick={() => setCollapsed(!checklistCollapsed)}
            aria-expanded={!checklistCollapsed}
            aria-label={checklistCollapsed ? t('checklist.expand') : t('checklist.collapse')}
          >
            {checklistCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          {setupUnlocked ? (
            <button
              type="button"
              className="activation-bar-skip"
              onClick={snoozeLater}
            >
              {t('spotlight.skip')}
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
};

export default ActivationChecklist;

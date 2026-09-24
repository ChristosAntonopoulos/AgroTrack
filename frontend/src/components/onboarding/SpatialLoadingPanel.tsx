import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Check, CloudSun, Satellite, Sparkles, Trees } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOwnerActivation } from '../../onboarding/OwnerActivationContext';
import {
  coreFirstDataReady,
  kickoffFieldFirstData,
  leadingReadyCount,
  pollFieldFirstData,
  type FirstDataFlags,
} from '../../onboarding/fieldFirstData';
import { ONBOARDING_TARGETS } from '../../onboarding/steps';
import './SpatialLoadingPanel.css';

type Props = {
  fieldId: string;
  fieldName: string;
};

const STAGES = ['weather', 'satellite', 'personalized'] as const;
type StageId = (typeof STAGES)[number];

const POLL_MS = 2500;
const MIN_STAGE_MS = 900;
/** Soft-accept satellite as “started” so welcome isn’t blocked forever by imagery lag. */
const SATELLITE_SOFT_MS = 22000;
const MAX_WAIT_MS = 90000;

const SpatialLoadingPanel: React.FC<Props> = ({ fieldId, fieldName }) => {
  const { t } = useTranslation('onboarding');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { completion, markFieldsDirty, skipStep, beginFirstObservationGuide } = useOwnerActivation();

  const [flags, setFlags] = useState<FirstDataFlags>({
    weather: false,
    satellite: false,
    personalized: false,
    failed: false,
  });
  const [revealed, setRevealed] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [satelliteSoft, setSatelliteSoft] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const effectiveFlags: FirstDataFlags = {
    ...flags,
    satellite: flags.satellite || satelliteSoft,
  };
  const readyCount = leadingReadyCount(effectiveFlags);
  const coreReady = coreFirstDataReady(effectiveFlags);
  const allReady = readyCount >= STAGES.length;
  const canWelcome = (coreReady && effectiveFlags.satellite) || timedOut;
  const failed = flags.failed && !coreReady;

  useEffect(() => {
    let cancelled = false;
    void kickoffFieldFirstData(fieldId).then(() => {
      if (!cancelled) markFieldsDirty();
    });
    return () => {
      cancelled = true;
    };
  }, [fieldId, markFieldsDirty]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const next = await pollFieldFirstData(fieldId);
      if (cancelled) return;
      setFlags(next);
      if (next.weather || next.personalized || next.satellite) markFieldsDirty();
    };
    void tick();
    const id = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [fieldId, markFieldsDirty]);

  useEffect(() => {
    if (flags.satellite || satelliteSoft) return;
    const id = window.setTimeout(() => setSatelliteSoft(true), SATELLITE_SOFT_MS);
    return () => window.clearTimeout(id);
  }, [flags.satellite, satelliteSoft]);

  useEffect(() => {
    setTimedOut(false);
    const id = window.setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
    return () => window.clearTimeout(id);
  }, [attempt]);

  // Advance stage UI as real data arrives (with a short minimum beat).
  useEffect(() => {
    if (revealed >= readyCount) return;
    const id = window.setTimeout(() => setRevealed((n) => Math.min(n + 1, readyCount)), MIN_STAGE_MS);
    return () => window.clearTimeout(id);
  }, [revealed, readyCount]);

  useEffect(() => {
    if (!canWelcome || showWelcome) return;
    if (revealed < Math.min(readyCount, STAGES.length) && !timedOut && !failed) return;
    const id = window.setTimeout(() => setShowWelcome(true), 500);
    return () => window.clearTimeout(id);
  }, [canWelcome, showWelcome, revealed, readyCount, timedOut, failed]);

  if (!completion.drawBoundary) return null;

  const firstName = user?.firstName?.trim();
  const displayName = fieldName.trim() || t('welcome.groveFallback');

  const continueToGrove = () => {
    beginFirstObservationGuide();
    markFieldsDirty();
    navigate(`/fields/${fieldId}?tab=details&activation=observe`, { replace: true });
  };

  const retry = async () => {
    setShowWelcome(false);
    setRevealed(0);
    setSatelliteSoft(false);
    setFlags({ weather: false, satellite: false, personalized: false, failed: false });
    setAttempt((n) => n + 1);
    await kickoffFieldFirstData(fieldId);
    markFieldsDirty();
  };

  const stageState = (index: number): 'pending' | 'active' | 'done' => {
    if (index < revealed) return 'done';
    if (index === revealed && !allReady) return 'active';
    if (allReady) return 'done';
    if (index === revealed) return 'active';
    return 'pending';
  };

  const iconFor = (id: StageId) => {
    if (id === 'weather') return <CloudSun size={22} strokeWidth={1.75} aria-hidden />;
    if (id === 'satellite') return <Satellite size={22} strokeWidth={1.75} aria-hidden />;
    return <Sparkles size={22} strokeWidth={1.75} aria-hidden />;
  };

  return createPortal(
    <div
      className="grove-sequence"
      role="dialog"
      aria-modal="true"
      aria-label={t('spatial.title')}
      data-onboarding-target={ONBOARDING_TARGETS.spatialPanel}
    >
      <div className="grove-sequence-backdrop" />
      <div className={`grove-sequence-card${showWelcome ? ' is-welcome' : ''}`}>
        {!showWelcome ? (
          <>
            <header className="grove-sequence-header">
              <p className="grove-sequence-kicker">{t('spatial.kicker')}</p>
              <h2>{t('spatial.title')}</h2>
              <p>{t('spatial.bodyNamed', { name: displayName })}</p>
              <p className="grove-sequence-hint">{t('spatial.firstDataHint')}</p>
            </header>

            <ul className="grove-sequence-stages">
              {STAGES.map((id, index) => {
                const state = stageState(index);
                return (
                  <li key={id} className={`grove-sequence-stage is-${state}`}>
                    <span className="grove-sequence-stage-icon" aria-hidden>
                      {state === 'done' ? <Check size={18} strokeWidth={2.5} /> : iconFor(id)}
                    </span>
                    <div className="grove-sequence-stage-copy">
                      <strong>{t(`spatial.stages.${id}.title`)}</strong>
                      <span>{t(`spatial.stages.${id}.body`)}</span>
                    </div>
                    <em className="grove-sequence-stage-status">
                      {state === 'done'
                        ? t('spatial.ready')
                        : state === 'active'
                          ? t('spatial.waiting')
                          : '·'}
                    </em>
                  </li>
                );
              })}
            </ul>

            {!canWelcome && !failed ? <div className="grove-sequence-pulse" aria-hidden /> : null}

            {failed ? (
              <div className="grove-sequence-actions">
                <button type="button" className="grove-sequence-btn" onClick={() => void retry()}>
                  {t('spatial.retry')}
                </button>
                <button
                  type="button"
                  className="grove-sequence-btn grove-sequence-btn--ghost"
                  onClick={continueToGrove}
                >
                  {t('spatial.continueAnyway')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="grove-sequence-skip"
                onClick={() => {
                  skipStep('loadData');
                  continueToGrove();
                }}
              >
                {t('spotlight.skip')}
              </button>
            )}
          </>
        ) : (
          <div className="grove-welcome">
            <span className="grove-welcome-mark" aria-hidden>
              <Trees size={28} strokeWidth={1.6} />
            </span>
            <p className="grove-sequence-kicker">{t('welcome.kicker')}</p>
            <h2>
              {firstName
                ? t('welcome.titleNamed', { name: firstName, grove: displayName })
                : t('welcome.title', { grove: displayName })}
            </h2>
            <p>{t('welcome.body')}</p>
            <ul className="grove-welcome-points">
              <li>{t('welcome.pointWeather')}</li>
              <li>{t('welcome.pointSatellite')}</li>
              <li>{t('welcome.pointMap')}</li>
            </ul>
            <button type="button" className="grove-sequence-btn" onClick={continueToGrove}>
              {t('welcome.openGrove')}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default SpatialLoadingPanel;

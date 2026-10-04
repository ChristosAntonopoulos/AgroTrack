import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Check, CloudSun, Loader2, Satellite, Trees } from 'lucide-react';
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

const STAGE_BEATS: Record<StageId, number> = {
  weather: 2,
  satellite: 2,
  personalized: 3,
};

const POLL_MS = 2500;
const MIN_STAGE_MS = 900;
const BEAT_MS = 2800;
/** Soft-accept satellite as “started” so welcome isn’t blocked forever by imagery lag. */
const SATELLITE_SOFT_MS = 22000;
const MAX_WAIT_MS = 90000;

const SpatialLoadingPanel: React.FC<Props> = ({ fieldId, fieldName }) => {
  const { t } = useTranslation('onboarding');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { completion, markFieldsDirty, beginDetailsLesson } = useOwnerActivation();

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
  const [beat, setBeat] = useState(0);
  const [creep, setCreep] = useState(0);
  const [autoRetried, setAutoRetried] = useState(false);

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

  // Keep the active row moving so the last stage does not look frozen.
  useEffect(() => {
    if (showWelcome || allReady) return;
    setBeat(0);
    setCreep(0);
    const started = Date.now();
    const beatId = window.setInterval(() => setBeat((n) => n + 1), BEAT_MS);
    const creepId = window.setInterval(() => {
      setCreep(Math.min(0.22, (Date.now() - started) / 50000));
    }, 200);
    return () => {
      window.clearInterval(beatId);
      window.clearInterval(creepId);
    };
  }, [revealed, showWelcome, allReady]);

  useEffect(() => {
    if (!failed || showWelcome || autoRetried) return;
    const id = window.setTimeout(() => {
      setAutoRetried(true);
      setShowWelcome(false);
      setRevealed(0);
      setSatelliteSoft(false);
      setFlags({ weather: false, satellite: false, personalized: false, failed: false });
      setAttempt((n) => n + 1);
      void kickoffFieldFirstData(fieldId).then(() => markFieldsDirty());
    }, 4000);
    return () => window.clearTimeout(id);
  }, [failed, showWelcome, autoRetried, fieldId, markFieldsDirty]);

  useEffect(() => {
    if (!canWelcome || showWelcome) return;
    if (revealed < Math.min(readyCount, STAGES.length) && !timedOut && !failed) return;
    const id = window.setTimeout(() => setShowWelcome(true), 500);
    return () => window.clearTimeout(id);
  }, [canWelcome, showWelcome, revealed, readyCount, timedOut, failed]);

  if (!completion.drawBoundary) return null;

  const firstName = user?.firstName?.trim();
  const displayName = fieldName.trim() || t('welcome.groveFallback');

  const continueToDetails = () => {
    beginDetailsLesson();
    markFieldsDirty();
    navigate(`/fields/${fieldId}?tab=map`, { replace: true });
  };

  const stageState = (index: number): 'pending' | 'active' | 'done' => {
    if (index < revealed) return 'done';
    if (allReady) return 'done';
    if (index === revealed) return 'active';
    return 'pending';
  };

  const activePhrase = (id: StageId) => {
    const index = beat % STAGE_BEATS[id];
    return t(`spatial.beats.${id}${index}`);
  };

  const fill = allReady ? 100 : Math.round(Math.min(0.96, (revealed + creep) / STAGES.length) * 100);

  const iconFor = (id: StageId, state: 'pending' | 'active' | 'done') => {
    if (state === 'done') return <Check size={18} strokeWidth={2.5} aria-hidden />;
    if (state === 'active') return <Loader2 size={18} strokeWidth={2.25} className="grove-sequence-spin" aria-hidden />;
    if (id === 'weather') return <CloudSun size={20} strokeWidth={1.75} aria-hidden />;
    if (id === 'satellite') return <Satellite size={20} strokeWidth={1.75} aria-hidden />;
    return <Trees size={20} strokeWidth={1.75} aria-hidden />;
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
      <article className="grove-sequence-sheet">
        <h2>
          {showWelcome
            ? firstName
              ? t('welcome.titleNamed', { name: firstName, grove: displayName })
              : t('welcome.title', { grove: displayName })
            : t('spatial.titleNamed', { name: displayName })}
        </h2>
        {!showWelcome ? (
          <>
            <p className="grove-sequence-lead">{t('spatial.bodyNamed', { name: displayName })}</p>
            <ul className="grove-sequence-stages">
              {STAGES.map((id, index) => {
                const state = stageState(index);
                return (
                  <li key={id} className={`grove-sequence-stage is-${state}`}>
                    <span className="grove-sequence-stage-icon" aria-hidden>
                      {iconFor(id, state)}
                    </span>
                    <div className="grove-sequence-stage-copy">
                      <strong>{t(`spatial.stages.${id}.title`)}</strong>
                      {state === 'active' ? <span>{activePhrase(id)}</span> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div
              className="grove-sequence-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={fill}
            >
              <span style={{ width: `${fill}%` }} />
            </div>
            <p className="grove-sequence-hold">
              {failed ? t('spatial.retrying') : t('spatial.stayHere')}
            </p>
          </>
        ) : (
          <>
            <p className="grove-sequence-lead">{t('welcome.body')}</p>
            <button type="button" className="grove-sequence-btn" onClick={continueToDetails}>
              {t('welcome.openMap')}
            </button>
          </>
        )}
      </article>
    </div>,
    document.body
  );
};

export default SpatialLoadingPanel;

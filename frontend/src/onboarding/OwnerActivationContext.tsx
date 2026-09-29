import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFieldService } from '../services/serviceFactory';
import { geospatialService } from '../services/geospatialService';
import { fieldPeopleService } from '../services/fieldPeopleService';
import type { Field } from '../services/fieldService';
import {
  canVisitActivationStep,
  evaluateStepCompletion,
  ownerHasAnyBoundary,
  pickActivationField,
  shouldRunOwnerActivation,
  spatialStatusFromProfiles,
  type SpatialReadiness,
} from './evaluate';
import { readPersisted, writePersisted } from './persistence';
import {
  emptyPersisted,
  OWNER_ACTIVATION_STEPS,
  stepPath,
  type OwnerActivationPersisted,
  type OwnerActivationStepId,
} from './steps';

export type SpotlightRoute = 'create' | 'boundary' | 'spatial' | 'observe' | null;

type OwnerActivationContextValue = {
  eligible: boolean;
  visible: boolean;
  /** True until first όρια — hard-locks non-setup routes unless Later. */
  setupUnlocked: boolean;
  locked: boolean;
  laterSnoozed: boolean;
  celebrating: boolean;
  checklistCollapsed: boolean;
  primaryField: Field | null;
  completion: Record<OwnerActivationStepId, boolean>;
  doneCount: number;
  activeStep: OwnerActivationStepId | null;
  skippedSteps: OwnerActivationStepId[];
  spatialStatus: SpatialReadiness;
  spotlightRoute: SpotlightRoute;
  spotlightStep: OwnerActivationStepId | null;
  /** Soft post-spatial guide: details → first observation → chronologio. */
  awaitingFirstObservation: boolean;
  refresh: () => Promise<void>;
  skipStep: (step: OwnerActivationStepId) => void;
  /** Before όρια = Later (snooze). After όρια = permanent dismiss. */
  dismiss: () => void;
  snoozeLater: () => void;
  clearLaterSnooze: () => void;
  reopen: () => void;
  setCollapsed: (collapsed: boolean) => void;
  goToStep: (step: OwnerActivationStepId) => void;
  clearCelebration: () => void;
  markFieldsDirty: (opts?: { boundarySavedFieldId?: string }) => void;
  /** After spatial welcome — land on details and guide first observation. */
  beginFirstObservationGuide: () => void;
  /** After observation posted/skipped — ends activation. */
  completeFirstObservation: () => void;
};

const OwnerActivationContext = createContext<OwnerActivationContextValue | undefined>(undefined);

const isCreatePath = (pathname: string) =>
  pathname === '/fields/new' || /^\/fields\/[^/]+\/edit$/.test(pathname);

export const OwnerActivationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = user?.userId;
  const role = user?.role;

  const [fields, setFields] = useState<Field[]>([]);
  const [ownsAnyField, setOwnsAnyField] = useState<boolean | null>(null);
  const [spatialStatus, setSpatialStatus] = useState<SpatialReadiness>('idle');
  const [persisted, setPersisted] = useState<OwnerActivationPersisted>(emptyPersisted);
  const [celebrating, setCelebrating] = useState(false);
  const [fieldsEpoch, setFieldsEpoch] = useState(0);
  const [fieldsHydrated, setFieldsHydrated] = useState(false);
  const [optimisticBoundaryFieldId, setOptimisticBoundaryFieldId] = useState<string | null>(null);
  const wasUnlocked = useRef(false);
  const pollRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!userId) {
      setPersisted(emptyPersisted());
      setFieldsHydrated(false);
      setOptimisticBoundaryFieldId(null);
      return;
    }
    setPersisted(readPersisted(userId));
  }, [userId]);

  const persist = useCallback(
    (next: OwnerActivationPersisted) => {
      setPersisted(next);
      if (userId) writePersisted(userId, next);
    },
    [userId]
  );

  const refreshSeq = useRef(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setFields([]);
      setOwnsAnyField(null);
      setFieldsHydrated(false);
      return;
    }
    const seq = ++refreshSeq.current;
    try {
      const [list, access] = await Promise.all([
        getFieldService().getFields(),
        fieldPeopleService.getAccessContext().catch(() => null),
      ]);
      if (seq !== refreshSeq.current) return;
      setFields(list);
      if (access) setOwnsAnyField(access.ownsAnyField);
      else setOwnsAnyField(list.some((f) => !f.ownerId || f.ownerId === userId));
    } catch {
      // Keep the last good list. Wiping it resets the ribbon to 0 of 3 and blanks Fields.
      if (seq !== refreshSeq.current) return;
    } finally {
      if (seq === refreshSeq.current) setFieldsHydrated(true);
    }
  }, [isAuthenticated, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh, fieldsEpoch, location.pathname]);

  const primaryField = useMemo(
    () => pickActivationField(fields, userId),
    [fields, userId]
  );

  const completion = useMemo(
    () =>
      evaluateStepCompletion(fields, primaryField, spatialStatus, {
        firstObservationDone:
          Boolean(persisted.firstObservationDoneAt) ||
          persisted.skippedSteps.includes('firstObservation'),
        knownBoundaryFieldId: optimisticBoundaryFieldId,
      }),
    [
      fields,
      primaryField,
      spatialStatus,
      persisted.firstObservationDoneAt,
      persisted.skippedSteps,
      optimisticBoundaryFieldId,
    ]
  );

  const doneCount = OWNER_ACTIVATION_STEPS.filter((s) => completion[s]).length;
  const allComplete = doneCount === OWNER_ACTIVATION_STEPS.length;
  /** Browse unlock = any owned grove has όρια (not spatial ready, not "primary only"). */
  const setupUnlocked =
    ownerHasAnyBoundary(fields, userId) || Boolean(optimisticBoundaryFieldId);
  const laterSnoozed = Boolean(persisted.laterSnoozedAt) && !setupUnlocked;

  const eligible = useMemo(
    () =>
      Boolean(
        isAuthenticated &&
          shouldRunOwnerActivation(role, fields, userId, ownsAnyField)
      ),
    [isAuthenticated, role, fields, userId, ownsAnyField]
  );

  /** Never hard-lock until the first fields fetch finishes (avoids kicking existing owners). */
  const locked = eligible && fieldsHydrated && !setupUnlocked && !laterSnoozed;

    // Poll spatial when boundary exists and data not ready.
  useEffect(() => {
    if (pollRef.current) {
      window.clearTimeout(pollRef.current);
      pollRef.current = undefined;
    }
    if (!eligible || !primaryField || !completion.drawBoundary) {
      if (!completion.drawBoundary) setSpatialStatus('idle');
      return;
    }

    let cancelled = false;
    let polls = 0;

    // Kick weather/timeline history once as soon as όρια exist (idempotent on the API).
    void geospatialService.requestHistoryBackfill(primaryField.id).catch(() => undefined);

    const load = async () => {
      const fieldId = primaryField.id;
      try {
        const [profile, summary] = await Promise.all([
          geospatialService.getSpatialProfile(fieldId).catch(() => null),
          geospatialService.getIntelligence(fieldId).catch(() => null),
        ]);
        if (cancelled) return;
        let next = spatialStatusFromProfiles(profile, summary);
        if (next === 'waiting' || next === 'idle') {
          await geospatialService.refreshIntelligence(fieldId).catch(() => undefined);
          const [p2, s2] = await Promise.all([
            geospatialService.getSpatialProfile(fieldId).catch(() => null),
            geospatialService.getIntelligence(fieldId).catch(() => null),
          ]);
          if (cancelled) return;
          next = spatialStatusFromProfiles(p2, s2);
        }
        setSpatialStatus(next);
        if ((next === 'waiting' || next === 'idle') && polls < 16) {
          polls += 1;
          pollRef.current = window.setTimeout(() => {
            void load();
          }, 2000);
        }
      } catch {
        if (!cancelled) setSpatialStatus('failed');
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
  }, [eligible, primaryField?.id, completion.drawBoundary, fieldsEpoch]);

  // Unlock browse at όρια — spatial welcome is separate (field map), not a lock.
  useEffect(() => {
    if (setupUnlocked && !wasUnlocked.current && eligible) {
      wasUnlocked.current = true;
      if (persisted.laterSnoozedAt || persisted.forceShow || persisted.checklistCollapsed) {
        persist({
          ...persisted,
          laterSnoozedAt: null,
          forceShow: false,
          checklistCollapsed: false,
        });
      }
    }
    if (!setupUnlocked) wasUnlocked.current = false;
  }, [setupUnlocked, eligible, persist, persisted]);

  useEffect(() => {
    if (ownerHasAnyBoundary(fields, userId) && optimisticBoundaryFieldId) {
      setOptimisticBoundaryFieldId(null);
    }
  }, [fields, userId, optimisticBoundaryFieldId]);

  const visible =
    eligible && (persisted.forceShow || !setupUnlocked);

  const activeStep = useMemo((): OwnerActivationStepId | null => {
    for (const step of OWNER_ACTIVATION_STEPS) {
      if (!completion[step]) return step;
    }
    return null;
  }, [completion]);

  const search = location.search;
  const spotlightRoute = useMemo((): SpotlightRoute => {
    if (!visible || !activeStep || laterSnoozed) return null;
    if (persisted.skippedSteps.includes(activeStep)) return null;
    const params = new URLSearchParams(search);
    if (activeStep === 'createGrove' && isCreatePath(location.pathname) && params.get('focus') !== 'boundary') {
      return 'create';
    }
    if (activeStep === 'drawBoundary' && params.get('focus') === 'boundary') {
      return 'boundary';
    }
    if (activeStep === 'loadData' && (params.get('activation') === 'spatial' || params.get('tab') === 'map')) {
      return 'spatial';
    }
    if (
      activeStep === 'firstObservation' &&
      (params.get('activation') === 'observe' || persisted.awaitingFirstObservation)
    ) {
      return 'observe';
    }
    return null;
  }, [
    visible,
    activeStep,
    laterSnoozed,
    persisted.skippedSteps,
    persisted.awaitingFirstObservation,
    location.pathname,
    search,
  ]);

  const spotlightStep =
    spotlightRoute === 'create'
      ? 'createGrove'
      : spotlightRoute === 'boundary'
        ? 'drawBoundary'
        : null;

  const snoozeLater = useCallback(() => {
    persist({
      ...persisted,
      laterSnoozedAt: new Date().toISOString(),
      checklistCollapsed: true,
      forceShow: false,
    });
    setCelebrating(false);
  }, [persist, persisted]);

  const clearLaterSnooze = useCallback(() => {
    persist({
      ...persisted,
      laterSnoozedAt: null,
      checklistCollapsed: false,
    });
  }, [persist, persisted]);

  const skipStep = useCallback(
    (step: OwnerActivationStepId) => {
      // Before όρια, spotlight "Later" snoozes the hard lock.
      if (!setupUnlocked) {
        snoozeLater();
        return;
      }
      // First Chronologio note is mandatory — cannot skip.
      if (step === 'firstObservation') {
        return;
      }
      if (persisted.skippedSteps.includes(step)) return;
      persist({
        ...persisted,
        skippedSteps: [...persisted.skippedSteps, step],
      });
    },
    [persist, persisted, setupUnlocked, snoozeLater]
  );

  const dismiss = useCallback(() => {
    if (!setupUnlocked) {
      snoozeLater();
      return;
    }
    persist({
      ...persisted,
      dismissedAt: new Date().toISOString(),
      forceShow: false,
      laterSnoozedAt: null,
    });
    setCelebrating(false);
  }, [persist, persisted, setupUnlocked, snoozeLater]);

  const reopen = useCallback(() => {
    persist({
      ...persisted,
      dismissedAt: null,
      forceShow: true,
      checklistCollapsed: false,
      skippedSteps: [],
      laterSnoozedAt: null,
      awaitingFirstObservation: false,
      firstObservationDoneAt: null,
    });
    setCelebrating(false);
  }, [persist, persisted]);

  const setCollapsed = useCallback(
    (collapsed: boolean) => {
      persist({ ...persisted, checklistCollapsed: collapsed });
    },
    [persist, persisted]
  );

  const goToStep = useCallback(
    (step: OwnerActivationStepId) => {
      if (!canVisitActivationStep(step, completion)) return;
      if (laterSnoozed) {
        persist({
          ...persisted,
          laterSnoozedAt: null,
          checklistCollapsed: false,
        });
      }
      const path = stepPath(step, primaryField?.id ?? null);
      navigate(path);
    },
    [navigate, primaryField?.id, laterSnoozed, persist, persisted, completion]
  );

  const clearCelebration = useCallback(() => {
    setCelebrating(false);
    if (setupUnlocked) {
      persist({
        ...persisted,
        dismissedAt: allComplete ? new Date().toISOString() : persisted.dismissedAt,
        forceShow: false,
        laterSnoozedAt: null,
      });
    }
  }, [allComplete, persist, persisted, setupUnlocked]);

  const beginFirstObservationGuide = useCallback(() => {
    persist({
      ...persisted,
      awaitingFirstObservation: true,
      forceShow: false,
      laterSnoozedAt: null,
    });
    setCelebrating(false);
  }, [persist, persisted]);

  const completeFirstObservation = useCallback(() => {
    persist({
      ...persisted,
      firstObservationDoneAt: new Date().toISOString(),
      awaitingFirstObservation: false,
      dismissedAt: new Date().toISOString(),
      forceShow: false,
      laterSnoozedAt: null,
    });
    setCelebrating(false);
  }, [persist, persisted]);

  const markFieldsDirty = useCallback((opts?: { boundarySavedFieldId?: string }) => {
    if (opts?.boundarySavedFieldId) {
      setOptimisticBoundaryFieldId(opts.boundarySavedFieldId);
    }
    setFieldsEpoch((n) => n + 1);
  }, []);

  const value = useMemo<OwnerActivationContextValue>(
    () => ({
      eligible,
      visible,
      setupUnlocked,
      locked,
      laterSnoozed,
      celebrating,
      checklistCollapsed: persisted.checklistCollapsed,
      primaryField,
      completion,
      doneCount,
      activeStep,
      skippedSteps: persisted.skippedSteps,
      spatialStatus,
      spotlightRoute,
      spotlightStep,
      awaitingFirstObservation: persisted.awaitingFirstObservation,
      refresh,
      skipStep,
      dismiss,
      snoozeLater,
      clearLaterSnooze,
      reopen,
      setCollapsed,
      goToStep,
      clearCelebration,
      markFieldsDirty,
      beginFirstObservationGuide,
      completeFirstObservation,
    }),
    [
      eligible,
      visible,
      setupUnlocked,
      locked,
      laterSnoozed,
      celebrating,
      persisted.checklistCollapsed,
      persisted.skippedSteps,
      persisted.awaitingFirstObservation,
      primaryField,
      completion,
      doneCount,
      activeStep,
      spatialStatus,
      spotlightRoute,
      spotlightStep,
      refresh,
      skipStep,
      dismiss,
      snoozeLater,
      clearLaterSnooze,
      reopen,
      setCollapsed,
      goToStep,
      clearCelebration,
      markFieldsDirty,
      beginFirstObservationGuide,
      completeFirstObservation,
    ]
  );

  return (
    <OwnerActivationContext.Provider value={value}>{children}</OwnerActivationContext.Provider>
  );
};

export const useOwnerActivation = (): OwnerActivationContextValue => {
  const ctx = useContext(OwnerActivationContext);
  if (!ctx) {
    throw new Error('useOwnerActivation must be used within OwnerActivationProvider');
  }
  return ctx;
};

export const useOwnerActivationOptional = (): OwnerActivationContextValue | null => {
  return useContext(OwnerActivationContext) ?? null;
};

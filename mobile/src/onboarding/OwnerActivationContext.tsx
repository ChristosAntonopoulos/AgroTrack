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
import type { NavigationContainerRef } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getFieldService } from '../services/serviceFactory';
import { geospatialService } from '../services/geospatialService';
import type { Field } from '../services/fieldService';
import type { RootStackParamList } from '../navigation/types';
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
  type OwnerActivationPersisted,
  type OwnerActivationStepId,
} from './steps';

type NavRef = React.RefObject<NavigationContainerRef<RootStackParamList> | null>;

type OwnerActivationContextValue = {
  eligible: boolean;
  visible: boolean;
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
  spotlightStep: OwnerActivationStepId | null;
  setSpotlightScreen: (screen: 'create' | 'boundary' | 'spatial' | null) => void;
  /** Soft post-spatial guide: details → first observation → chronologio. */
  awaitingFirstObservation: boolean;
  refresh: () => Promise<void>;
  skipStep: (step: OwnerActivationStepId) => void;
  dismiss: () => void;
  snoozeLater: () => void;
  clearLaterSnooze: () => void;
  reopen: () => void;
  setCollapsed: (collapsed: boolean) => void;
  goToStep: (step: OwnerActivationStepId) => void;
  clearCelebration: () => void;
  markFieldsDirty: (opts?: { boundarySavedFieldId?: string }) => void;
  beginFirstObservationGuide: () => void;
  completeFirstObservation: () => void;
};

const OwnerActivationContext = createContext<OwnerActivationContextValue | undefined>(undefined);

export const OwnerActivationProvider: React.FC<{
  children: ReactNode;
  navRef: NavRef;
}> = ({ children, navRef }) => {
  const { user, isAuthenticated, isFieldOwner } = useAuth();
  const userId = user?.id;
  const role = user?.role;

  const [fields, setFields] = useState<Field[]>([]);
  const [spatialStatus, setSpatialStatus] = useState<SpatialReadiness>('idle');
  const [persisted, setPersisted] = useState<OwnerActivationPersisted>(emptyPersisted);
  const [celebrating, setCelebrating] = useState(false);
  const [fieldsEpoch, setFieldsEpoch] = useState(0);
  const [fieldsHydrated, setFieldsHydrated] = useState(false);
  const [optimisticBoundaryFieldId, setOptimisticBoundaryFieldId] = useState<string | null>(null);
  const [spotlightScreen, setSpotlightScreen] = useState<'create' | 'boundary' | 'spatial' | null>(
    null
  );
  const wasUnlocked = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) {
      setPersisted(emptyPersisted());
      setFieldsHydrated(false);
      setOptimisticBoundaryFieldId(null);
      return;
    }
    void readPersisted(userId).then(setPersisted);
  }, [userId]);

  const persist = useCallback(
    (next: OwnerActivationPersisted) => {
      setPersisted(next);
      if (userId) void writePersisted(userId, next);
    },
    [userId]
  );

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setFields([]);
      setFieldsHydrated(false);
      return;
    }
    try {
      const list = await getFieldService().getFields(userId, role || 'FieldOwner');
      setFields(list);
    } catch {
      setFields([]);
    } finally {
      setFieldsHydrated(true);
    }
  }, [isAuthenticated, userId, role]);

  useEffect(() => {
    void refresh();
  }, [refresh, fieldsEpoch]);

  const primaryField = useMemo(() => pickActivationField(fields, userId), [fields, userId]);

  const completion = useMemo(
    () =>
      evaluateStepCompletion(fields, primaryField, spatialStatus, {
        firstObservationDone:
          Boolean(persisted.firstObservationDoneAt) ||
          persisted.skippedSteps.includes('firstObservation'),
      }),
    [fields, primaryField, spatialStatus, persisted.firstObservationDoneAt, persisted.skippedSteps]
  );

  const doneCount = OWNER_ACTIVATION_STEPS.filter((s) => completion[s]).length;
  const allComplete = doneCount === OWNER_ACTIVATION_STEPS.length;
  const setupUnlocked =
    ownerHasAnyBoundary(fields, userId) || Boolean(optimisticBoundaryFieldId);
  const laterSnoozed = Boolean(persisted.laterSnoozedAt) && !setupUnlocked;

  const eligible = useMemo(
    () =>
      Boolean(
        isAuthenticated &&
          isFieldOwner() &&
          shouldRunOwnerActivation(role, fields, userId)
      ),
    [isAuthenticated, isFieldOwner, role, fields, userId]
  );

  const locked = eligible && fieldsHydrated && !setupUnlocked && !laterSnoozed;

  useEffect(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
    if (!eligible || !primaryField || !completion.drawBoundary) {
      if (!completion.drawBoundary) setSpatialStatus('idle');
      return;
    }

    let cancelled = false;
    let polls = 0;

    void geospatialService.requestHistoryBackfill(primaryField.id).catch(() => undefined);

    const load = async () => {
      const fieldId = primaryField.id;
      try {
        const [profile, summary] = await Promise.all([
          geospatialService.getSpatialProfile(fieldId),
          geospatialService.getIntelligence(fieldId),
        ]);
        if (cancelled) return;
        let next = spatialStatusFromProfiles(profile, summary);
        if (next === 'waiting' || next === 'idle') {
          await geospatialService.refreshIntelligence(fieldId).catch(() => false);
          const [p2, s2] = await Promise.all([
            geospatialService.getSpatialProfile(fieldId),
            geospatialService.getIntelligence(fieldId),
          ]);
          if (cancelled) return;
          next = spatialStatusFromProfiles(p2, s2);
        }
        setSpatialStatus(next);
        if ((next === 'waiting' || next === 'idle') && polls < 16) {
          polls += 1;
          pollTimer.current = setTimeout(() => {
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
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [eligible, primaryField?.id, completion.drawBoundary, fieldsEpoch]);

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

  const visible = eligible && (persisted.forceShow || !setupUnlocked);

  const activeStep = useMemo((): OwnerActivationStepId | null => {
    for (const step of OWNER_ACTIVATION_STEPS) {
      if (!completion[step]) return step;
    }
    return null;
  }, [completion]);

  const spotlightStep = useMemo((): OwnerActivationStepId | null => {
    if (!visible || !activeStep || laterSnoozed) return null;
    if (persisted.skippedSteps.includes(activeStep)) return null;
    if (activeStep === 'createGrove' && spotlightScreen === 'create') return 'createGrove';
    if (activeStep === 'drawBoundary' && spotlightScreen === 'boundary') return 'drawBoundary';
    return null;
  }, [visible, activeStep, laterSnoozed, persisted.skippedSteps, spotlightScreen]);

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
      const nav = navRef.current;
      if (!nav) return;
      if (step === 'createGrove') {
        nav.navigate('FieldForm', primaryField ? { fieldId: primaryField.id } : {});
        return;
      }
      if (step === 'drawBoundary' && primaryField) {
        nav.navigate('FieldMapBoundary', { fieldId: primaryField.id });
        return;
      }
      if (step === 'loadData' && primaryField) {
        nav.navigate('FieldDetail', {
          fieldId: primaryField.id,
          mode: 'map',
          activation: 'spatial',
        });
        return;
      }
      if (step === 'firstObservation' && primaryField) {
        persist({
          ...persisted,
          awaitingFirstObservation: true,
          laterSnoozedAt: null,
        });
        nav.navigate('FieldDetail', {
          fieldId: primaryField.id,
          mode: 'details',
          activation: 'observe',
        });
      }
    },
    [navRef, primaryField, laterSnoozed, persist, persisted, completion]
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
      spotlightStep,
      setSpotlightScreen,
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

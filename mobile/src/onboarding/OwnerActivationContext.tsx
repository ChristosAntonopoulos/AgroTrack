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
  type GuideTargetId,
  type NavCoachPhase,
  type OwnerActivationPersisted,
  type OwnerActivationStepId,
} from './steps';

export type GuideRect = {
  id: GuideTargetId;
  x: number;
  y: number;
  width: number;
  height: number;
};

type NavRef = React.RefObject<NavigationContainerRef<RootStackParamList> | null>;

type OwnerActivationContextValue = {
  eligible: boolean;
  /** False until fields and saved setup state are loaded — checklist must not paint on a guess. */
  ready: boolean;
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
  /** Soft post-spatial guide: details → home → History → first observation. */
  awaitingFirstObservation: boolean;
  /** The control the grower should tap next. Null while a form or a quiet pause owns the screen. */
  guideBeat: GuideTargetId | null;
  guideRect: GuideRect | null;
  reportGuideTarget: (id: GuideTargetId, rect: Omit<GuideRect, 'id'>) => void;
  /** After spatial welcome: land on field details, then teach home → History. */
  beginDetailsLesson: () => void;
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
  const [persistedHydrated, setPersistedHydrated] = useState(false);
  const [optimisticBoundaryFieldId, setOptimisticBoundaryFieldId] = useState<string | null>(null);
  const [spotlightScreen, setSpotlightScreen] = useState<'create' | 'boundary' | 'spatial' | null>(
    null
  );
  const [routeName, setRouteName] = useState('');
  const [routeMode, setRouteMode] = useState('');
  const [guideRect, setGuideRect] = useState<GuideRect | null>(null);
  const persistedRef = useRef(persisted);
  persistedRef.current = persisted;
  const lingerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasUnlocked = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshSeq = useRef(0);

  useEffect(() => {
    if (!userId) {
      setPersisted(emptyPersisted());
      setFieldsHydrated(false);
      setPersistedHydrated(false);
      setOptimisticBoundaryFieldId(null);
      return;
    }
    let cancelled = false;
    setPersistedHydrated(false);
    void readPersisted(userId).then((next) => {
      if (cancelled) return;
      setPersisted(next);
      setPersistedHydrated(true);
    });
    return () => {
      cancelled = true;
    };
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
    const seq = ++refreshSeq.current;
    try {
      const list = await getFieldService().getFields(userId, role || 'FieldOwner');
      if (seq !== refreshSeq.current) return;
      setFields(list);
    } catch {
      // Keep the last good list. Wiping it resets the ribbon to 0 of 3 and blanks Fields.
      if (seq !== refreshSeq.current) return;
    } finally {
      if (seq === refreshSeq.current) setFieldsHydrated(true);
    }
  }, [isAuthenticated, userId, role]);

  useEffect(() => {
    void refresh();
  }, [refresh, fieldsEpoch]);

  useEffect(() => {
    let unsub = () => {};
    let wait: ReturnType<typeof setTimeout> | null = null;

    const attach = () => {
      const nav = navRef.current;
      if (!nav) {
        wait = setTimeout(attach, 200);
        return;
      }
      const sync = () => {
        const route = nav.getCurrentRoute();
        setRouteName(route?.name ?? '');
        const params = route?.params as { mode?: string } | undefined;
        setRouteMode(typeof params?.mode === 'string' ? params.mode : '');
      };
      sync();
      unsub = nav.addListener('state', sync);
    };

    attach();
    return () => {
      if (wait) clearTimeout(wait);
      unsub();
    };
  }, [navRef, isAuthenticated]);

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

  const ready = fieldsHydrated && persistedHydrated;
  const visible = ready && eligible && (persisted.forceShow || !setupUnlocked);

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

  const guideBeat = useMemo((): GuideTargetId | null => {
    if (!ready || !eligible || laterSnoozed || persisted.dismissedAt) return null;
    if (persisted.firstObservationDoneAt) return null;

    if (!completion.createGrove) {
      if (routeName === 'Launcher') return 'fieldsCard';
      if (routeName === 'FieldsHome') return 'createField';
      return null;
    }

    if (persisted.navCoachPhase === 'home') return 'homeButton';
    if (persisted.navCoachPhase === 'history' && routeName === 'Launcher') return 'historyCard';
    return null;
  }, [
    ready,
    eligible,
    laterSnoozed,
    persisted.dismissedAt,
    persisted.firstObservationDoneAt,
    persisted.navCoachPhase,
    completion.createGrove,
    routeName,
  ]);

  const setNavCoachPhase = useCallback(
    (phase: NavCoachPhase | null) => {
      const current = persistedRef.current;
      if (current.navCoachPhase === phase) return;
      persist({ ...current, navCoachPhase: phase });
    },
    [persist]
  );

  const beginDetailsLesson = useCallback(() => {
    const current = persistedRef.current;
    if (current.firstObservationDoneAt) return;
    persist({
      ...current,
      navCoachPhase: 'linger',
      forceShow: false,
      laterSnoozedAt: null,
    });
    setCelebrating(false);
  }, [persist]);

  const arriveAtHistory = useCallback(() => {
    const current = persistedRef.current;
    if (current.firstObservationDoneAt) return;
    persist({
      ...current,
      navCoachPhase: null,
      awaitingFirstObservation: true,
      forceShow: false,
      laterSnoozedAt: null,
    });
    setCelebrating(false);
  }, [persist]);

  useEffect(() => {
    const onDetails = persisted.navCoachPhase === 'linger' && routeName === 'FieldDetail';
    if (!onDetails) {
      if (lingerTimer.current) {
        clearTimeout(lingerTimer.current);
        lingerTimer.current = null;
      }
      return;
    }
    if (lingerTimer.current) return;
    lingerTimer.current = setTimeout(() => {
      lingerTimer.current = null;
      setNavCoachPhase('home');
    }, 5000);
  }, [persisted.navCoachPhase, routeName, setNavCoachPhase]);

  useEffect(() => {
    return () => {
      if (lingerTimer.current) clearTimeout(lingerTimer.current);
    };
  }, []);

  useEffect(() => {
    if (persisted.navCoachPhase !== 'linger') return;
    if (routeName === 'Launcher') setNavCoachPhase('history');
    if (
      routeName === 'ChronologioTab' ||
      routeName === 'Chronologio' ||
      (routeName === 'FieldDetail' && routeMode === 'chronologio')
    ) {
      arriveAtHistory();
    }
  }, [persisted.navCoachPhase, routeName, routeMode, setNavCoachPhase, arriveAtHistory]);

  useEffect(() => {
    if (persisted.navCoachPhase !== 'home' || routeName !== 'Launcher') return;
    setNavCoachPhase('history');
  }, [persisted.navCoachPhase, routeName, setNavCoachPhase]);

  useEffect(() => {
    if (persisted.navCoachPhase !== 'history') return;
    const onHistory =
      routeName === 'ChronologioTab' ||
      routeName === 'Chronologio' ||
      (routeName === 'FieldDetail' && routeMode === 'chronologio');
    if (!onHistory) return;
    arriveAtHistory();
  }, [persisted.navCoachPhase, routeName, routeMode, arriveAtHistory]);

  const reportGuideTarget = useCallback((id: GuideTargetId, rect: Omit<GuideRect, 'id'>) => {
    setGuideRect((prev) => {
      if (
        prev &&
        prev.id === id &&
        Math.abs(prev.x - rect.x) < 1 &&
        Math.abs(prev.y - rect.y) < 1 &&
        Math.abs(prev.width - rect.width) < 1 &&
        Math.abs(prev.height - rect.height) < 1
      ) {
        return prev;
      }
      return { id, ...rect };
    });
  }, []);

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
      navCoachPhase: null,
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
      navCoachPhase: null,
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
      ready,
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
      guideBeat,
      guideRect: guideRect && guideBeat && guideRect.id === guideBeat ? guideRect : null,
      reportGuideTarget,
      beginDetailsLesson,
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
      ready,
      visible,
      setupUnlocked,
      locked,
      laterSnoozed,
      celebrating,
      persisted.checklistCollapsed,
      persisted.skippedSteps,
      persisted.awaitingFirstObservation,
      guideBeat,
      guideRect,
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
      beginDetailsLesson,
      reportGuideTarget,
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

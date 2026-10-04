import {
  emptyPersisted,
  OWNER_ACTIVATION_STEPS,
  storageKeyFor,
  type NavCoachPhase,
  type OwnerActivationPersisted,
  type OwnerActivationStepId,
} from './steps';

const NAV_COACH_PHASES: readonly NavCoachPhase[] = ['linger', 'home', 'history'];

const isNavCoachPhase = (value: unknown): value is NavCoachPhase =>
  typeof value === 'string' && (NAV_COACH_PHASES as readonly string[]).includes(value);

const isStepId = (value: unknown): value is OwnerActivationStepId =>
  typeof value === 'string' && (OWNER_ACTIVATION_STEPS as readonly string[]).includes(value);

export const readPersisted = (userId: string): OwnerActivationPersisted => {
  try {
    const raw = localStorage.getItem(storageKeyFor(userId));
    if (!raw) return emptyPersisted();
    const parsed = JSON.parse(raw) as Partial<OwnerActivationPersisted>;
    const skipped = Array.isArray(parsed.skippedSteps)
      ? parsed.skippedSteps.filter(isStepId)
      : [];
    return {
      skippedSteps: skipped,
      dismissedAt: typeof parsed.dismissedAt === 'string' ? parsed.dismissedAt : null,
      checklistCollapsed: Boolean(parsed.checklistCollapsed),
      forceShow: Boolean(parsed.forceShow),
      laterSnoozedAt: typeof parsed.laterSnoozedAt === 'string' ? parsed.laterSnoozedAt : null,
      awaitingFirstObservation: Boolean(parsed.awaitingFirstObservation),
      firstObservationDoneAt:
        typeof parsed.firstObservationDoneAt === 'string' ? parsed.firstObservationDoneAt : null,
      navCoachPhase: isNavCoachPhase(parsed.navCoachPhase) ? parsed.navCoachPhase : null,
    };
  } catch {
    return emptyPersisted();
  }
};

export const writePersisted = (userId: string, next: OwnerActivationPersisted): void => {
  try {
    localStorage.setItem(storageKeyFor(userId), JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
};

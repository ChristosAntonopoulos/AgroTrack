import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  emptyPersisted,
  OWNER_ACTIVATION_STEPS,
  storageKeyFor,
  type OwnerActivationPersisted,
  type OwnerActivationStepId,
} from './steps';

const isStepId = (value: unknown): value is OwnerActivationStepId =>
  typeof value === 'string' && (OWNER_ACTIVATION_STEPS as readonly string[]).includes(value);

export const readPersisted = async (userId: string): Promise<OwnerActivationPersisted> => {
  try {
    const raw = await AsyncStorage.getItem(storageKeyFor(userId));
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
    };
  } catch {
    return emptyPersisted();
  }
};

export const writePersisted = async (
  userId: string,
  next: OwnerActivationPersisted
): Promise<void> => {
  try {
    await AsyncStorage.setItem(storageKeyFor(userId), JSON.stringify(next));
  } catch {
    /* ignore */
  }
};

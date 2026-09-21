import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UpdateFieldWorkProfileInput } from '../services/fieldWorkService';
import type { OnboardingStepId } from './fieldWorkOnboardingSteps';

const draftKey = (fieldId: string) => `oleachron.fieldWorkProfile.v1.${fieldId}`;
const dismissKey = (fieldId: string) => `oleachron.fieldWorkSetupBanner.dismissed.${fieldId}`;

export interface FieldWorkProfileOfflineDraft {
  fieldId: string;
  stepId: OnboardingStepId;
  pendingUpdate: UpdateFieldWorkProfileInput;
  needsSync: boolean;
  updatedAt: string;
}

export const readWorkProfileDraft = async (
  fieldId: string
): Promise<FieldWorkProfileOfflineDraft | null> => {
  try {
    const raw = await AsyncStorage.getItem(draftKey(fieldId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FieldWorkProfileOfflineDraft;
    if (!parsed || parsed.fieldId !== fieldId || !parsed.stepId) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const writeWorkProfileDraft = async (draft: FieldWorkProfileOfflineDraft): Promise<void> => {
  try {
    await AsyncStorage.setItem(draftKey(draft.fieldId), JSON.stringify(draft));
  } catch {
    /* ignore quota */
  }
};

export const clearWorkProfileDraft = async (fieldId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(draftKey(fieldId));
  } catch {
    /* ignore */
  }
};

export const isWorkSetupBannerDismissed = async (fieldId: string): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(dismissKey(fieldId))) === '1';
  } catch {
    return false;
  }
};

export const dismissWorkSetupBanner = async (fieldId: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(dismissKey(fieldId), '1');
  } catch {
    /* ignore */
  }
};

export const mergePendingUpdates = (
  base: UpdateFieldWorkProfileInput,
  patch: UpdateFieldWorkProfileInput
): UpdateFieldWorkProfileInput => ({
  ...base,
  ...patch,
  irrigation: patch.irrigation ? { ...base.irrigation, ...patch.irrigation } : base.irrigation,
  pruning: patch.pruning ? { ...base.pruning, ...patch.pruning } : base.pruning,
  fertilisation: patch.fertilisation
    ? { ...base.fertilisation, ...patch.fertilisation }
    : base.fertilisation,
  groundCover: patch.groundCover
    ? { ...base.groundCover, ...patch.groundCover }
    : base.groundCover,
  pestManagement: patch.pestManagement
    ? { ...base.pestManagement, ...patch.pestManagement }
    : base.pestManagement,
  analysis: patch.analysis ? { ...base.analysis, ...patch.analysis } : base.analysis,
  harvest: patch.harvest ? { ...base.harvest, ...patch.harvest } : base.harvest,
  notificationPreference: patch.notificationPreference
    ? { ...base.notificationPreference, ...patch.notificationPreference }
    : base.notificationPreference,
  defaultAssignments: patch.defaultAssignments ?? base.defaultAssignments,
  currentYearDeclaredWork: patch.currentYearDeclaredWork ?? base.currentYearDeclaredWork,
});

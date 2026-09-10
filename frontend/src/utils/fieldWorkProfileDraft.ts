import type { UpdateFieldWorkProfileInput } from '../services/fieldWorkService';
import type { OnboardingStepId } from './fieldWorkOnboardingSteps';

const draftKey = (fieldId: string) => `oleachron.fieldWorkProfile.v1.${fieldId}`;

export interface FieldWorkProfileOfflineDraft {
  fieldId: string;
  stepId: OnboardingStepId;
  /** Latest merged PUT body pieces (partial). */
  pendingUpdate: UpdateFieldWorkProfileInput;
  /** True when a PUT failed or device was offline. */
  needsSync: boolean;
  updatedAt: string;
}

export const readWorkProfileDraft = (fieldId: string): FieldWorkProfileOfflineDraft | null => {
  try {
    const raw = localStorage.getItem(draftKey(fieldId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FieldWorkProfileOfflineDraft;
    if (!parsed || parsed.fieldId !== fieldId || !parsed.stepId) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const writeWorkProfileDraft = (draft: FieldWorkProfileOfflineDraft): void => {
  try {
    localStorage.setItem(draftKey(draft.fieldId), JSON.stringify(draft));
  } catch {
    // ignore quota / private mode
  }
};

export const clearWorkProfileDraft = (fieldId: string): void => {
  try {
    localStorage.removeItem(draftKey(fieldId));
  } catch {
    // ignore
  }
};

/** Deep-merge pending update objects (later patch wins for top-level practice blocks). */
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

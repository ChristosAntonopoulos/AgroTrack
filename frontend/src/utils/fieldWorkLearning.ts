/** Pure Field Work ongoing-learning helpers (Phase 6). No silent preference writes. */

export const DISMISSAL_PROMPT_THRESHOLD = 3;
export const ANNUAL_REVIEW_DAYS = 365;

export type DismissalLearningChoice = 'dont_propose' | 'ask_when_indicated' | 'keep_proposing';

export type CompletionFrequencyChoice =
  | 'every_2_years'
  | 'every_year'
  | 'when_needed'
  | 'no_change';

export function shouldPromptDismissalLearning(dismissCount: number): boolean {
  return dismissCount >= DISMISSAL_PROMPT_THRESHOLD;
}

export function isAnnualReviewDue(
  lastReviewedAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!lastReviewedAt) return true;
  const reviewed = new Date(lastReviewedAt);
  if (Number.isNaN(reviewed.getTime())) return true;
  const ms = now.getTime() - reviewed.getTime();
  return ms >= ANNUAL_REVIEW_DAYS * 24 * 60 * 60 * 1000;
}

export function shouldPromptCompletionFrequency(
  templateCode: string | null | undefined,
  outcome: string | null | undefined
): boolean {
  if ((templateCode || '').toUpperCase() !== 'T06') return false;
  const o = (outcome || '').toLowerCase();
  return o === 'completed' || o === 'partially_completed';
}

export function practiceKeyFromTemplate(templateCode: string): string {
  const code = (templateCode || '').toUpperCase();
  switch (code) {
    case 'T06':
    case 'T07':
      return 'pruning';
    case 'T08':
    case 'T15':
      return 'irrigation';
    case 'T04':
    case 'T05':
      return 'fertilisation';
    case 'T09':
      return 'ground_cover';
    case 'T03':
    case 'T16':
      return 'analysis';
    case 'T19':
    case 'T20':
      return 'harvest';
    case 'T11':
    case 'T12':
    case 'T13':
    case 'T14':
      return 'pest';
    default:
      return 'other';
  }
}

/** DefaultAssignments category (Question 9) for a template. */
export function assignmentCategoryFromTemplate(templateCode: string): string {
  const key = practiceKeyFromTemplate(templateCode);
  if (key === 'pest' || key === 'analysis') return 'monitoring';
  if (key === 'other') return 'monitoring';
  return key;
}

export function resolveDismissalPreferenceMode(
  choice: DismissalLearningChoice,
  currentMode: string
): string {
  if (choice === 'dont_propose') return 'disabled';
  if (choice === 'ask_when_indicated') return 'ask_first';
  if (currentMode === 'unknown' || currentMode === 'disabled') return 'enabled';
  return currentMode || 'enabled';
}

/** Returns null when choice is no_change — callers must not write the profile. */
export function resolveCompletionFrequencyUpdate(
  choice: CompletionFrequencyChoice,
  resultYear: number
): { lastPerformedYear: number; frequencyType: string; frequencyValue: number | null } | null {
  if (choice === 'no_change') return null;
  if (choice === 'every_2_years') {
    return { lastPerformedYear: resultYear, frequencyType: 'every_n_years', frequencyValue: 2 };
  }
  if (choice === 'every_year') {
    return { lastPerformedYear: resultYear, frequencyType: 'times_per_year', frequencyValue: 1 };
  }
  if (choice === 'when_needed') {
    return { lastPerformedYear: resultYear, frequencyType: 'when_needed', frequencyValue: null };
  }
  return null;
}

/**
 * Version bump path for incremental onboarding questions.
 * Raise CurrentOnboardingVersion on the backend and register new question ids —
 * never force a full onboarding restart.
 */
export function pendingIncrementalQuestionIds(
  profileOnboardingVersion: number,
  currentOnboardingVersion: number
): string[] {
  if (currentOnboardingVersion <= profileOnboardingVersion) return [];
  // No incremental questions registered beyond v1 yet.
  return [];
}

export type SuggestedAssignee = {
  assignedUserId?: string;
  isSelf: boolean;
};

export function suggestAssigneeFromProfile(
  profile: {
    status?: string;
    pruning?: { defaultAssigneeId?: string | null };
    irrigation?: { defaultAssigneeId?: string | null };
    fertilisation?: { defaultAssigneeId?: string | null };
    groundCover?: { defaultAssigneeId?: string | null };
    pestManagement?: { defaultAssigneeId?: string | null };
    analysis?: { defaultAssigneeId?: string | null };
    harvest?: { defaultAssigneeId?: string | null };
    defaultAssignments?: { entries?: Array<{ category: string; assigneeUserId?: string | null; isSelf: boolean }> };
  } | null | undefined,
  templateCode: string,
  actingUserId?: string | null
): SuggestedAssignee | null {
  if (!profile || profile.status !== 'active') return null;

  const practiceKey = practiceKeyFromTemplate(templateCode);
  const practiceMap: Record<string, { defaultAssigneeId?: string | null } | undefined> = {
    pruning: profile.pruning,
    irrigation: profile.irrigation,
    fertilisation: profile.fertilisation,
    ground_cover: profile.groundCover,
    pest: profile.pestManagement,
    analysis: profile.analysis,
    harvest: profile.harvest,
  };
  const practiceId = practiceMap[practiceKey]?.defaultAssigneeId;
  if (practiceId) {
    return { assignedUserId: practiceId, isSelf: Boolean(actingUserId && practiceId === actingUserId) };
  }

  const category = assignmentCategoryFromTemplate(templateCode);
  const entry = profile.defaultAssignments?.entries?.find((e) => e.category === category);
  if (!entry) return null;
  if (entry.isSelf) {
    return actingUserId ? { assignedUserId: actingUserId, isSelf: true } : { isSelf: true };
  }
  if (entry.assigneeUserId) {
    return { assignedUserId: entry.assigneeUserId, isSelf: false };
  }
  return null;
}

export function assigneeOptionKey(
  suggestion: SuggestedAssignee | null,
  actingUserId?: string | null
): string {
  if (!suggestion) return 'later';
  if (suggestion.isSelf && actingUserId) return `user:${actingUserId}`;
  if (suggestion.assignedUserId) return `user:${suggestion.assignedUserId}`;
  return 'later';
}

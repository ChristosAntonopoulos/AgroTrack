export type DismissalLearningChoice = 'dont_propose' | 'ask_when_indicated' | 'keep_proposing';

export type CompletionFrequencyChoice =
  | 'every_2_years'
  | 'every_year'
  | 'when_needed'
  | 'no_change';

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

export function assignmentCategoryFromTemplate(templateCode: string): string {
  const key = practiceKeyFromTemplate(templateCode);
  if (key === 'pest' || key === 'analysis') return 'monitoring';
  if (key === 'other') return 'monitoring';
  return key;
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
    defaultAssignments?: {
      entries?: Array<{ category: string; assigneeUserId?: string | null; isSelf: boolean }>;
    };
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
  if (suggestion?.isSelf && actingUserId) return `user:${actingUserId}`;
  if (suggestion?.assignedUserId) return `user:${suggestion.assignedUserId}`;
  if (actingUserId) return `user:${actingUserId}`;
  return 'later';
}

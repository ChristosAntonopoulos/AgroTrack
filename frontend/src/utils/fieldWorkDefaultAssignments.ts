import type { DefaultAssignmentEntry, DefaultAssignments } from '../services/fieldWorkService';

/** Categories for default task suggestions (Question 9 style). */
export const DEFAULT_ASSIGNMENT_CATEGORIES = [
  'pruning',
  'fertilisation',
  'ground_cover',
  'irrigation',
  'monitoring',
  'harvest',
] as const;

export type DefaultAssignmentCategory = (typeof DEFAULT_ASSIGNMENT_CATEGORIES)[number];

export type DefaultAssigneeChoice = 'me' | 'collaborator' | 'later';

export function getAssignmentForCategory(
  assignments: DefaultAssignments | null | undefined,
  category: string
): DefaultAssignmentEntry | undefined {
  return assignments?.entries?.find((e) => e.category === category);
}

export function upsertAssignmentEntry(
  assignments: DefaultAssignments | null | undefined,
  entry: DefaultAssignmentEntry
): DefaultAssignments {
  const rest = (assignments?.entries ?? []).filter((e) => e.category !== entry.category);
  return { entries: [...rest, entry] };
}

export function choiceFromEntry(entry: DefaultAssignmentEntry | undefined): DefaultAssigneeChoice {
  if (!entry) return 'later';
  if (entry.isSelf) return 'me';
  if (entry.assigneeUserId) return 'collaborator';
  return 'later';
}

export function entryFromChoice(
  category: string,
  choice: DefaultAssigneeChoice,
  collaboratorUserId?: string | null
): DefaultAssignmentEntry {
  if (choice === 'me') {
    return { category, isSelf: true, assigneeUserId: null };
  }
  if (choice === 'collaborator' && collaboratorUserId) {
    return { category, isSelf: false, assigneeUserId: collaboratorUserId };
  }
  return { category, isSelf: false, assigneeUserId: null };
}

/** True when collaborators exist or onboarding indicated someone else may do work. */
export function shouldShowDefaultAssignments(
  assignments: DefaultAssignments | null | undefined,
  hasCollaborators: boolean
): boolean {
  if (hasCollaborators) return true;
  return (assignments?.entries ?? []).some((e) => !e.isSelf);
}

/**
 * Summarise one category for maintenance UI.
 * Labels come from i18n keys — callers pass resolved strings.
 */
export function summarizeAssignment(
  entry: DefaultAssignmentEntry | undefined,
  labels: { me: string; later: string; person: (name: string) => string },
  personName?: string | null
): string {
  const choice = choiceFromEntry(entry);
  if (choice === 'me') return labels.me;
  if (choice === 'collaborator') {
    return labels.person(personName || entry?.assigneeUserId || '…');
  }
  return labels.later;
}

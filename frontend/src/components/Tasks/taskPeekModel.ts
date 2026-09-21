import type { FieldMembership } from '../../services/fieldPeopleService';
import type { SavedContact } from '../../services/partnerService';
import type { FieldTask, FieldTaskChecklistItem } from '../../services/fieldWorkService';
import { isWeatherSensitiveTemplate } from '../../data/fieldWorkCatalogueLabels';
import type { ProposalChip } from '../../utils/proposalPresentation';
import { resolveWeatherKind } from '../../utils/taskWeather';

export type AssigneeOption = {
  key: string;
  label: string;
  userId?: string;
  contactId?: string;
};

export const checklistLabel = (item: FieldTaskChecklistItem, lang: string) => {
  if (lang.toLowerCase().startsWith('el')) return item.greekLabel || item.label;
  return item.englishLabel || item.label;
};

export const checklistValue = (item: FieldTaskChecklistItem, lang: string): string | null => {
  if (!item.isAnswered) return null;
  const type = (item.itemType || '').toLowerCase();
  if (type === 'number' && item.numberValue != null) {
    return `${item.numberValue}${item.unit ? ` ${item.unit}` : ''}`;
  }
  if (type === 'text' && item.textValue) return item.textValue;
  if (type === 'choice' && item.textValue) return item.textValue;
  if (item.boolValue === true) return lang.toLowerCase().startsWith('el') ? 'Ναι' : 'Yes';
  if (item.boolValue === false) return lang.toLowerCase().startsWith('el') ? 'Όχι' : 'No';
  return lang.toLowerCase().startsWith('el') ? 'Έγινε' : 'Done';
};

export const buildAssigneeOptions = (
  people: FieldMembership[],
  contacts: SavedContact[],
  unassignedLabel: string
): AssigneeOption[] => {
  const opts: AssigneeOption[] = [{ key: '', label: unassignedLabel }];
  people.forEach((p) => {
    opts.push({
      key: `user:${p.userId}`,
      label: p.displayName || p.email || p.userId,
      userId: p.userId,
    });
  });
  contacts.forEach((c) => {
    if (c.linkedUserId && people.some((p) => p.userId === c.linkedUserId)) return;
    opts.push({
      key: `contact:${c.id}`,
      label: c.displayName,
      contactId: c.id,
      userId: c.linkedUserId,
    });
  });
  return opts;
};

export const assigneeKeyOf = (task: FieldTask | null | undefined) => {
  if (task?.assignedUserId) return `user:${task.assignedUserId}`;
  if (task?.assignedCollaboratorId) return `contact:${task.assignedCollaboratorId}`;
  return '';
};

export const taskStatusClass = (status: string) => {
  if (status === 'in_progress') return 'is-active';
  if (status === 'completed') return 'is-done';
  if (status === 'blocked') return 'is-blocked';
  return 'is-planned';
};

export const buildWeatherChip = (task: FieldTask | null | undefined): ProposalChip | null => {
  if (!task) return null;
  const weatherKind = resolveWeatherKind(task.weatherSuitability);
  const showWeather =
    weatherKind === 'unknown' ||
    (isWeatherSensitiveTemplate(task.templateCode) && weatherKind !== 'not_sensitive');
  if (!showWeather) return null;
  return {
    id:
      weatherKind === 'good'
        ? 'good'
        : weatherKind === 'caution'
          ? 'caution'
          : weatherKind === 'unsuitable'
            ? 'unsuitable'
            : 'unknown',
    labelKey: `fieldWork.proposal.chips.${weatherKind === 'unknown' ? 'unknown' : weatherKind}`,
  };
};

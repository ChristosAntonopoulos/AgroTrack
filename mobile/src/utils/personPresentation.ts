import { Field } from '../services/fieldService';
import { GrovePerson } from './grovePeople';
import { normalizePhoneNumber } from './phoneLinks';

export type PersonGroupKey = 'onField' | 'services';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Prefer human role over system source tags. */
export function personRoleLabel(person: GrovePerson, t: Translate): string {
  if (person.serviceLabels[0]) return person.serviceLabels[0];
  if (person.connections.includes('owner')) return t('partners:roles.fieldLead');
  if (person.connections.includes('works')) return t('partners:roles.worker');
  if (person.connections.includes('advises')) return t('partners:roles.advisor');
  if (person.connections.includes('helps')) return t('partners:roles.helper');
  if (person.connections.includes('partner')) return t('partners:roles.partner');
  if (person.connections.includes('invited')) return t('partners:roles.invited');
  if (person.connections.includes('sees')) return t('partners:roles.viewer');
  if (person.listed) return t('partners:roles.service');
  return t('partners:roles.collaborator');
}

export function isFieldResponsible(person: GrovePerson): boolean {
  return person.connections.includes('owner');
}

export function personHasApp(person: GrovePerson): boolean {
  return Boolean(person.userId) || person.connections.includes('app') || person.listed;
}

export function personGroup(person: GrovePerson): PersonGroupKey {
  if (person.listed || person.connections.includes('partner')) {
    if (
      person.connections.includes('owner') ||
      person.connections.includes('works') ||
      person.connections.includes('helps') ||
      person.membership
    ) {
      return 'onField';
    }
    return 'services';
  }
  return 'onField';
}

export function fieldNamesForPerson(person: GrovePerson, fields: Field[]): string[] {
  const ids = person.fieldIds?.length
    ? person.fieldIds
    : person.savedContact?.fieldIds || [];
  if (!ids.length) return [];
  return ids
    .map((id) => fields.find((f) => f.id === id)?.name)
    .filter((name): name is string => Boolean(name));
}

export function formatPhoneShort(phone?: string | null): string | undefined {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return phone?.trim() || undefined;
  // +306972100881 → +30 697 210 0881 (best-effort)
  const digits = normalized.slice(1);
  if (digits.startsWith('30') && digits.length === 12) {
    return `+30 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return normalized;
}

/** Second line under the name: role · fields (no system tags, no phone). */
export function personSubtitle(person: GrovePerson, fields: Field[], t: Translate): string {
  const role = personRoleLabel(person, t);
  const names = fieldNamesForPerson(person, fields);
  if (names.length === 1) return `${role} · ${names[0]}`;
  if (names.length > 1) return `${role} · ${names.length} ${t('partners:detail.fields').toLowerCase()}`;
  return role;
}

export function personContextLine(person: GrovePerson, fields: Field[], t: Translate, language: string): string | undefined {
  const fieldCount = person.fieldIds?.length || person.savedContact?.fieldIds?.length || 0;
  if (isFieldResponsible(person) && fieldCount > 1) {
    return t('partners:context.fieldsLead', { count: fieldCount });
  }
  const updated = person.savedContact?.updatedAt;
  if (updated) {
    try {
      const date = new Date(updated);
      if (!Number.isNaN(date.getTime())) {
        const formatted = date.toLocaleDateString(language.startsWith('el') ? 'el-GR' : 'en-GB', {
          day: 'numeric',
          month: 'short',
        });
        return t('partners:context.lastTouch', { date: formatted });
      }
    } catch {
      /* ignore */
    }
  }
  if (fieldCount === 0 && person.unassigned) {
    return t('partners:context.noField');
  }
  return undefined;
}

export function groupPeople(people: GrovePerson[]): {
  onField: GrovePerson[];
  services: GrovePerson[];
  showGroups: boolean;
} {
  const onField = people.filter((p) => personGroup(p) === 'onField');
  const services = people.filter((p) => personGroup(p) === 'services');
  const showGroups = people.length >= 4 && onField.length > 0 && services.length > 0;
  return { onField, services, showGroups };
}

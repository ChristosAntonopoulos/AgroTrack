import {
  FieldAccessLevel,
  FieldInvite,
  FieldMembership,
  FieldModule,
  FieldPersonRole,
  ManagedContact,
  ManagedPeople,
  ManageableFieldSummary,
  PersonAccess,
} from '../services/fieldPeopleService';
import { SavedContact } from '../services/partnerService';

export interface AggregateField {
  id: string;
  name: string;
  ownerId?: string;
}

const isActive = (status?: string) => /^active$/i.test(status || '');
const isPending = (status?: string) => /^(pending|expired|invited)$/i.test(status || '');

const relationshipOf = (role: FieldPersonRole): FieldPersonRole =>
  role === 'Partner' ? 'Partner' : 'Family';

const personKey = (userId?: string, email?: string, name?: string) => {
  if (userId) return `user:${userId}`;
  if (email?.trim()) return `email:${email.trim().toLowerCase()}`;
  return `name:${(name || '').trim().toLowerCase()}`;
};

export const toManagedContact = (contact: SavedContact): ManagedContact => ({
  id: contact.id,
  displayName: contact.displayName,
  phone: contact.phone,
  email: contact.email,
  notes: contact.notes,
  serviceCategoryIds: contact.serviceCategoryIds || [],
  fieldIds: contact.fieldIds || [],
  linkedUserId: contact.linkedUserId,
  source: contact.source === 'PhoneBook' ? 'PhoneBook' : 'Manual',
  createdAt: contact.createdAt,
  updatedAt: contact.updatedAt,
});

/**
 * One card per person. Only groves this account owns are manageable.
 * Shared groves (where the account is Family or Collaborator) stay out.
 */
export function aggregateManagedPeople(input: {
  fields: AggregateField[];
  userId: string;
  ownerDisplayName?: string;
  ownerEmail?: string;
  membershipsByField: Record<string, FieldMembership[]>;
  invitesByField: Record<string, FieldInvite[]>;
  contacts: SavedContact[];
}): ManagedPeople {
  const owned = input.fields.filter((field) => field.ownerId === input.userId);
  const manageableFields: ManageableFieldSummary[] = owned.map((field) => ({
    id: field.id,
    name: field.name,
    ownerUserId: input.userId,
    ownerDisplayName: input.ownerDisplayName,
    ownerEmail: input.ownerEmail,
  }));

  const people = new Map<string, PersonAccess>();
  const pendingInvites: FieldInvite[] = [];

  owned.forEach((field) => {
    (input.membershipsByField[field.id] || []).forEach((member) => {
      if (member.role === 'Admin') return;
      if (!isActive(member.status)) return;
      const key = personKey(member.userId, member.email, member.displayName);
      const existing = people.get(key);
      const membership = {
        fieldId: field.id,
        fieldName: field.name,
        relationship: relationshipOf(member.role),
        accessPreset: member.accessLevel,
        modules: member.modules,
        status: member.status,
      };
      if (!existing) {
        people.set(key, {
          userId: member.userId,
          displayName: member.displayName || member.email || '',
          email: member.email,
          memberships: [membership],
        });
        return;
      }
      if (!existing.displayName && member.displayName) existing.displayName = member.displayName;
      existing.memberships.push(membership);
    });

    (input.invitesByField[field.id] || []).forEach((invite) => {
      if (isPending(invite.status)) pendingInvites.push(invite);
    });
  });

  return {
    people: [...people.values()].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    pendingInvites,
    contacts: input.contacts.map(toManagedContact),
    manageableFields,
  };
}

export const VISIBLE_MODULES: FieldModule[] = [
  'fields',
  'chronologio',
  'tasks',
  'photos',
  'money',
  'harvest',
];

/** What the farmer picks. Stored access is view, or work. Recording without tasks omits the tasks module. */
export type AccessChoice = 'view' | 'record' | 'work';

export const modulesForChoice = (choice: AccessChoice): FieldModule[] => {
  if (choice === 'work') return ['fields', 'chronologio', 'photos', 'tasks', 'harvest'];
  return ['fields', 'chronologio', 'photos'];
};

export const levelForChoice = (choice: AccessChoice): FieldAccessLevel =>
  choice === 'view' ? 'view' : 'work';

/**
 * Card label. `help` is the older task-update level: it does not add records,
 * so it must not be shown as "Record".
 */
export const presetLabelKey = (
  level: string,
  modules: string[]
): 'view' | 'record' | 'work' | 'help' => {
  if (level === 'view') return 'view';
  if (level === 'help') return 'help';
  return modules.includes('tasks') ? 'work' : 'record';
};

export const choiceFromAccess = (level: string, modules: string[]): AccessChoice | null => {
  if (level === 'help') return null;
  if (level === 'view') return 'view';
  return modules.includes('tasks') ? 'work' : 'record';
};

/** Plain-language capability line for member cards (not technical role names). */
export const capabilitySummaryKey = (
  level: string,
  modules: string[]
): 'view' | 'record' | 'work' | 'help' => presetLabelKey(level, modules);

export const defaultPresetForRelationship = (
  relationship: 'Family' | 'Collaborator'
): AccessChoice => (relationship === 'Family' ? 'view' : 'work');

import {
  FieldMembership,
  capacitiesForMembership,
} from '../../services/fieldPeopleService';
import {
  SavedContact,
  ServiceCategory,
  ServiceContactRequest,
  categoryName,
} from '../../services/partnerService';

export type GroveConnection =
  | 'owner'
  | 'works'
  | 'advises'
  | 'helps'
  | 'sees'
  | 'invited'
  | 'partner'
  | 'contact'
  | 'app'
  | 'family'
  | 'partnerSeat';

export type GrovePerson = {
  id: string;
  userId?: string;
  displayName: string;
  phone?: string;
  email?: string;
  connections: GroveConnection[];
  serviceLabels: string[];
  listed: boolean;
  membership?: FieldMembership;
  savedContact?: SavedContact;
  unassigned?: boolean;
  fieldIds?: string[];
};

type MembershipRow = FieldMembership & { fieldId?: string };

const union = (current: GroveConnection[], extra: GroveConnection[]) => {
  extra.forEach((item) => {
    if (!current.includes(item)) current.push(item);
  });
};

const KEEP_CONTACT = new Set(['New', 'Viewed', 'Accepted', 'Closed']);

const ORDER: GroveConnection[] = [
  'owner',
  'partnerSeat',
  'family',
  'works',
  'advises',
  'helps',
  'sees',
  'invited',
  'partner',
  'contact',
  'app',
];

export function connectionsFromMembership(member: FieldMembership): GroveConnection[] {
  const out: GroveConnection[] = [];
  if (member.status === 'invited' || member.status === 'pending') out.push('invited');
  if (member.role === 'Admin') out.push('owner');
  else if (member.role === 'Partner') out.push('partnerSeat');
  else if (member.role === 'Family') out.push('family');

  const capacities = capacitiesForMembership(member);
  if (capacities.includes('work') && !out.includes('owner') && !out.includes('partnerSeat')) {
    out.push('works');
  }
  if (capacities.includes('help') && !out.includes('family')) out.push('helps');
  if (
    capacities.includes('view') &&
    !out.includes('owner') &&
    !out.includes('works') &&
    !out.includes('partnerSeat') &&
    !out.includes('family')
  ) {
    out.push('sees');
  }
  return out.length > 0 ? out : ['works'];
}

const jobLabels = (contact: SavedContact, categories: ServiceCategory[], language: string) =>
  contact.serviceCategoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is ServiceCategory => Boolean(c))
    .map((c) => categoryName(c, language));

export function mergeGrovePeople(
  members: MembershipRow[],
  outgoing: ServiceContactRequest[],
  savedContacts: SavedContact[],
  fieldId: string,
  language: string,
  categories: ServiceCategory[] = []
): GrovePerson[] {
  const map = new Map<string, GrovePerson>();

  members.forEach((member) => {
    if (member.status === 'removed' || member.status === 'revoked') return;
    const connections = connectionsFromMembership(member);
    const existing = map.get(member.userId);
    if (existing) {
      union(existing.connections, connections);
      if (member.fieldId && !existing.fieldIds?.includes(member.fieldId)) {
        existing.fieldIds = [...(existing.fieldIds || []), member.fieldId];
      }
      existing.membership = existing.membership || member;
      return;
    }
    map.set(member.userId, {
      id: member.userId,
      userId: member.userId,
      displayName: member.displayName || member.email || member.userId,
      connections,
      serviceLabels: [],
      listed: false,
      membership: member,
      fieldIds: member.fieldId ? [member.fieldId] : [],
    });
  });

  outgoing.forEach((contact) => {
    if (!KEEP_CONTACT.has(contact.status)) return;
    if (!contact.fieldId) return;
    if (fieldId && contact.fieldId !== fieldId) return;
    const id = contact.providerUserId;
    const label = contact.category ? categoryName(contact.category, language) : '';
    const existing = map.get(id);
    if (existing) {
      if (!existing.connections.includes('partner')) existing.connections.push('partner');
      if (label && !existing.serviceLabels.includes(label)) existing.serviceLabels.push(label);
      existing.listed = true;
      return;
    }
    map.set(id, {
      id,
      userId: contact.providerUserId,
      displayName: contact.providerName || contact.providerUserId,
      connections: ['partner'],
      serviceLabels: label ? [label] : [],
      listed: true,
    });
  });

  savedContacts.forEach((contact) => {
    const labels = jobLabels(contact, categories, language);
    const linked = contact.linkedUserId ? map.get(contact.linkedUserId) : undefined;
    if (linked) {
      if (!linked.connections.includes('contact')) linked.connections.push('contact');
      if (!linked.connections.includes('app')) linked.connections.push('app');
      linked.savedContact = contact;
      linked.phone = contact.phone || linked.phone;
      linked.email = contact.email || linked.email;
      linked.fieldIds = [...new Set([...(linked.fieldIds || []), ...contact.fieldIds])];
      labels.forEach((label) => {
        if (!linked.serviceLabels.includes(label)) linked.serviceLabels.push(label);
      });
      return;
    }

    const connections: GroveConnection[] = ['contact'];
    if (contact.linkedUserId) connections.push('app');

    map.set(`saved:${contact.id}`, {
      id: `saved:${contact.id}`,
      userId: contact.linkedUserId,
      displayName: contact.displayName,
      phone: contact.phone,
      email: contact.email,
      connections,
      serviceLabels: labels,
      listed: false,
      savedContact: contact,
      fieldIds: [...contact.fieldIds],
      unassigned: contact.fieldIds.length === 0,
    });
  });

  return [...map.values()].sort((a, b) => {
    const ai = Math.min(...a.connections.map((c) => ORDER.indexOf(c)));
    const bi = Math.min(...b.connections.map((c) => ORDER.indexOf(c)));
    return ai - bi || a.displayName.localeCompare(b.displayName, language);
  });
}

/** Phone-book entries only — not field memberships or marketplace listings. */
export function fromSavedContacts(
  savedContacts: SavedContact[],
  language: string,
  categories: ServiceCategory[] = []
): GrovePerson[] {
  return mergeGrovePeople([], [], savedContacts, '', language, categories);
}

export function linkedFieldIds(person: GrovePerson): string[] {
  return [...new Set([...(person.fieldIds || []), ...(person.savedContact?.fieldIds || [])])];
}

export function occupiesAccessSeat(
  person: GrovePerson,
  accessUserIds: Set<string>,
  accessEmails: Set<string>
): boolean {
  if (person.userId && accessUserIds.has(person.userId)) return true;
  const email = (person.email || person.savedContact?.email || '').trim().toLowerCase();
  return Boolean(email && accessEmails.has(email));
}

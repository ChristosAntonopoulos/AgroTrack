import { FieldMembership } from '../services/fieldPeopleService';
import {
  SavedContact,
  ServiceCategory,
  ServiceContactRequest,
  categoryName,
} from '../services/partnerService';

export type GroveConnection = 'owner' | 'works' | 'advises' | 'helps' | 'sees' | 'invited' | 'partner' | 'contact' | 'app';

export type GrovePerson = {
  id: string;
  userId?: string;
  displayName: string;
  phone?: string;
  connections: GroveConnection[];
  serviceLabels: string[];
  listed: boolean;
  membership?: FieldMembership;
  savedContact?: SavedContact;
  unassigned?: boolean;
};

const KEEP_CONTACT = new Set(['New', 'Viewed', 'Accepted', 'Closed']);
const ORDER: GroveConnection[] = ['owner', 'works', 'advises', 'helps', 'sees', 'invited', 'partner', 'contact', 'app'];

const jobLabels = (contact: SavedContact, categories: ServiceCategory[], language: string) =>
  contact.serviceCategoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is ServiceCategory => Boolean(c))
    .map((c) => categoryName(c, language));

export function mergeGrovePeople(
  members: FieldMembership[],
  outgoing: ServiceContactRequest[],
  savedContacts: SavedContact[],
  fieldId: string,
  language: string,
  categories: ServiceCategory[] = []
): GrovePerson[] {
  const map = new Map<string, GrovePerson>();

  members.forEach((member) => {
    if (member.status === 'removed') return;
    const connections: GroveConnection[] = [];
    if (member.status === 'invited' || member.status === 'pending') connections.push('invited');
    if (member.capacities.includes('own')) connections.push('owner');
    if (member.capacities.includes('work')) connections.push('works');
    if (member.capacities.includes('advise')) connections.push('advises');
    if (member.capacities.includes('help')) connections.push('helps');
    if (member.capacities.includes('view') && connections.length === 0) connections.push('sees');
    map.set(member.userId, {
      id: member.userId,
      userId: member.userId,
      displayName: member.displayName || member.email || member.userId,
      connections: connections.length ? connections : ['works'],
      serviceLabels: [],
      listed: false,
      membership: member,
    });
  });

  outgoing.forEach((contact) => {
    if (!KEEP_CONTACT.has(contact.status)) return;
    if (!contact.fieldId || contact.fieldId !== fieldId) return;
    const id = contact.providerUserId;
    if (!id) return;
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
      userId: id,
      displayName: contact.providerName || id,
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
      connections,
      serviceLabels: labels,
      listed: false,
      savedContact: contact,
      unassigned: contact.fieldIds.length === 0,
    });
  });

  return [...map.values()].sort((a, b) => {
    const ai = Math.min(...a.connections.map((c) => ORDER.indexOf(c)));
    const bi = Math.min(...b.connections.map((c) => ORDER.indexOf(c)));
    return ai - bi || a.displayName.localeCompare(b.displayName, language);
  });
}

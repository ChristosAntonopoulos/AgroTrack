import { aggregateManagedPeople, presetLabelKey } from './aggregatePeople';
import { FieldInvite, FieldMembership } from '../services/fieldPeopleService';
import { SavedContact } from '../services/partnerService';

const member = (overrides: Partial<FieldMembership>): FieldMembership => ({
  userId: 'eleni',
  displayName: 'Ελένη Παπαδάκη',
  email: 'family@olivefarm.com',
  role: 'Family',
  modules: ['chronologio', 'photos'],
  accessLevel: 'view',
  status: 'active',
  createdAt: '2026-01-01',
  ...overrides,
});

const emptyContact = (): SavedContact => ({
  id: 'c1',
  displayName: 'Νίκος',
  phone: '6900000000',
  email: '',
  notes: 'Κλαδευτής',
  serviceCategoryIds: [],
  fieldIds: [],
  source: 'Manual',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
});

describe('aggregateManagedPeople', () => {
  const fields = [
    { id: 'a', name: 'Επάνω Ελαιώνας', ownerId: 'chris' },
    { id: 'b', name: 'Κάτω Ελαιώνας', ownerId: 'chris' },
    { id: 'c', name: 'Ξένος ελαιώνας', ownerId: 'giorgos' },
  ];

  it('shows one person once when they belong to several owned groves', () => {
    const result = aggregateManagedPeople({
      fields,
      userId: 'chris',
      membershipsByField: {
        a: [member({ role: 'Family', accessLevel: 'view' })],
        b: [member({ role: 'Family', accessLevel: 'view' })],
        c: [member({ role: 'Partner', accessLevel: 'work', userId: 'eleni' })],
      },
      invitesByField: {},
      contacts: [],
    });

    expect(result.people).toHaveLength(1);
    expect(result.people[0].displayName).toBe('Ελένη Παπαδάκη');
    expect(result.people[0].memberships.map((row) => row.fieldId)).toEqual(['a', 'b']);
  });

  it('omits groves the account does not own', () => {
    const result = aggregateManagedPeople({
      fields,
      userId: 'chris',
      membershipsByField: {},
      invitesByField: {},
      contacts: [],
    });

    expect(result.manageableFields.map((field) => field.id)).toEqual(['a', 'b']);
  });

  it('keeps pending invites out of the active people list', () => {
    const invite: FieldInvite = {
      id: 'inv-1',
      token: 'tok',
      fieldId: 'a',
      fieldName: 'Επάνω Ελαιώνας',
      invitedBy: 'chris',
      role: 'Partner',
      modules: ['tasks'],
      accessLevel: 'work',
      email: 'maria@gmail.com',
      status: 'pending',
      expiresAt: '2026-10-10',
      shareUrl: 'https://example/invite/tok',
      whatsAppUrl: '',
    };
    const result = aggregateManagedPeople({
      fields,
      userId: 'chris',
      membershipsByField: {
        a: [member({ userId: '', email: 'maria@gmail.com', status: 'pending', role: 'Partner' })],
      },
      invitesByField: { a: [invite] },
      contacts: [emptyContact()],
    });

    expect(result.people).toHaveLength(0);
    expect(result.pendingInvites).toHaveLength(1);
    expect(result.contacts).toHaveLength(1);
  });

  it('labels recording separately from task work and from the older help level', () => {
    expect(presetLabelKey('view', ['chronologio'])).toBe('view');
    expect(presetLabelKey('work', ['chronologio', 'photos'])).toBe('record');
    expect(presetLabelKey('work', ['chronologio', 'tasks'])).toBe('work');
    expect(presetLabelKey('help', ['tasks'])).toBe('help');
  });
});

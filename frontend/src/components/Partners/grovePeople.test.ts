import { fromSavedContacts, occupiesAccessSeat } from './grovePeople';
import { SavedContact } from '../../services/partnerService';

const contact = (overrides: Partial<SavedContact> = {}): SavedContact => ({
  id: 'c1',
  displayName: 'Mill',
  phone: '+30 27610 22010',
  email: 'mill@olivefarm.com',
  notes: '',
  serviceCategoryIds: [],
  fieldIds: ['f1'],
  linkedUserId: undefined,
  source: 'Manual',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
});

describe('fromSavedContacts', () => {
  it('maps phone-book entries without field memberships', () => {
    const people = fromSavedContacts([contact()], 'el', []);
    expect(people).toHaveLength(1);
    expect(people[0].savedContact?.id).toBe('c1');
    expect(people[0].membership).toBeUndefined();
    expect(people[0].listed).toBe(false);
    expect(people[0].email).toBe('mill@olivefarm.com');
  });
});

describe('occupiesAccessSeat', () => {
  it('hides contacts that already have family or partner access', () => {
    const [person] = fromSavedContacts(
      [contact({ linkedUserId: 'producer-1', email: 'producer1@olivefarm.com' })],
      'el',
      []
    );
    expect(occupiesAccessSeat(person, new Set(['producer-1']), new Set())).toBe(true);
    expect(
      occupiesAccessSeat(person, new Set(), new Set(['producer1@olivefarm.com']))
    ).toBe(true);
    expect(occupiesAccessSeat(person, new Set(), new Set())).toBe(false);
  });
});

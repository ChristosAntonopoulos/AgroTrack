import { filterNavItemsForUser, navItems } from './navConfig';

const partnerVisible = (
  role: 'FieldOwner' | 'Producer',
  admin: boolean,
  modules?: string[]
) =>
  filterNavItemsForUser(navItems, role, false, {
    modules: modules ? new Set(modules) : null,
    isAdminOnActive: admin,
  }).some((item) => item.path === '/partners');

describe('partners navigation', () => {
  it('stays available to a collaborator so they can see partners and family', () => {
    expect(partnerVisible('Producer', false, ['fields', 'tasks'])).toBe(true);
    expect(partnerVisible('FieldOwner', false, ['fields', 'tasks', 'chronologio'])).toBe(true);
  });

  it('stays available to the field admin', () => {
    expect(partnerVisible('FieldOwner', true)).toBe(true);
  });
});

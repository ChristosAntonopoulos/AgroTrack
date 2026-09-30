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

const primaryPaths = [
  '/chronologio',
  '/fields',
  '/tasks',
  '/money',
  '/photos',
  '/my-oil',
] as const;

describe('partners navigation', () => {
  it('stays available to a collaborator so they can see partners and family', () => {
    expect(partnerVisible('Producer', false, ['fields', 'tasks'])).toBe(true);
    expect(partnerVisible('FieldOwner', false, ['fields', 'tasks', 'chronologio'])).toBe(true);
  });

  it('stays available to the field admin', () => {
    expect(partnerVisible('FieldOwner', true)).toBe(true);
  });
});

describe('field-scoped visibility navigation', () => {
  it('shows primary modules to a collaborator even with empty/narrow modules', () => {
    const visible = filterNavItemsForUser(navItems, 'Producer', false, {
      modules: new Set(['chronologio']),
      isAdminOnActive: false,
      canViewHarvest: false,
    });
    const paths = visible.map((item) => item.path);
    for (const path of primaryPaths) {
      expect(paths).toContain(path);
    }
  });

  it('still hides ministry and reports from the sidebar', () => {
    const paths = filterNavItemsForUser(navItems, 'FieldOwner', false, {
      modules: null,
      isAdminOnActive: true,
    }).map((item) => item.path);
    expect(paths).not.toContain('/ministry');
    expect(paths).not.toContain('/reports');
  });
});

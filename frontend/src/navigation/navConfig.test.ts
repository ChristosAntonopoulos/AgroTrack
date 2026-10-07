import {
  filterNavItemsForUser,
  isTopLevelAppPath,
  navItems,
  resolveParentPath,
  shouldHideGlobalPageTitle,
} from './navConfig';

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

describe('top-level app chrome', () => {
  it('treats primary module roots as top-level', () => {
    for (const path of primaryPaths) {
      expect(isTopLevelAppPath(path)).toBe(true);
    }
    expect(isTopLevelAppPath('/harvest')).toBe(true);
    expect(isTopLevelAppPath('/partners')).toBe(true);
    expect(isTopLevelAppPath('/settings')).toBe(true);
  });

  it('treats nested routes as not top-level', () => {
    expect(isTopLevelAppPath('/fields/abc')).toBe(false);
    expect(isTopLevelAppPath('/tasks/new')).toBe(false);
    expect(isTopLevelAppPath('/partners/me')).toBe(false);
    expect(isTopLevelAppPath('/this-harvest/review')).toBe(false);
  });

  it('always hides the global header page title', () => {
    expect(shouldHideGlobalPageTitle('/money')).toBe(true);
    expect(shouldHideGlobalPageTitle('/fields/abc')).toBe(true);
  });

  it('resolves fixed parents for nested routes', () => {
    expect(resolveParentPath('/fields')).toBeNull();
    expect(resolveParentPath('/fields/abc')).toBe('/fields');
    expect(resolveParentPath('/fields/abc/weather')).toBe('/fields/abc');
    expect(resolveParentPath('/fields/abc/edit')).toBe('/fields');
    expect(resolveParentPath('/tasks/new')).toBe('/tasks');
    expect(resolveParentPath('/partners/me')).toBe('/partners');
    expect(resolveParentPath('/this-harvest/review')).toBe('/harvest');
    expect(resolveParentPath('/admin/campaigns/x')).toBe('/admin/campaigns');
    expect(resolveParentPath('/admin/users')).toBe('/admin');
    expect(resolveParentPath('/admin/errors')).toBe('/admin');
    expect(resolveParentPath('/admin')).toBeNull();
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

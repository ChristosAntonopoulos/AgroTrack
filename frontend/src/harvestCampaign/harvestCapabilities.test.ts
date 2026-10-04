import { getHarvestCapabilities } from './harvestCapabilities';

describe('getHarvestCapabilities', () => {
  it('lets view-only seats see harvest with an inline edit reason', () => {
    const caps = getHarvestCapabilities({
      hasAnyFieldAccess: true,
      canOwn: false,
      canWork: false,
      accessLevel: 'view',
      familyModules: new Set(['harvest', 'chronologio']),
      harvestModuleGranted: true,
    });

    expect(caps.canView).toBe(true);
    expect(caps.canAddSacks).toBe(false);
    expect(caps.canCloseDay).toBe(false);
    expect(caps.isViewOnly).toBe(true);
    expect(caps.editRestrictionReasonKey).toBe('viewOnly');
    expect(caps.captureKinds).toEqual([]);
  });

  it('lets help seats view without production, with a help reason', () => {
    const caps = getHarvestCapabilities({
      hasAnyFieldAccess: true,
      canOwn: false,
      canWork: true,
      accessLevel: 'help',
      familyModules: new Set(['harvest', 'chronologio']),
      harvestModuleGranted: true,
    });

    expect(caps.canView).toBe(true);
    expect(caps.canAddSacks).toBe(false);
    expect(caps.editRestrictionReasonKey).toBe('helpOnly');
  });

  it('gives owners full produce rights', () => {
    const caps = getHarvestCapabilities({
      hasAnyFieldAccess: true,
      canOwn: true,
      canWork: true,
      accessLevel: 'work',
      familyModules: null,
    });

    expect(caps.canView).toBe(true);
    expect(caps.canAddSacks).toBe(true);
    expect(caps.editRestrictionReasonKey).toBeNull();
    expect(caps.captureKinds).toEqual(
      expect.arrayContaining(['sacks', 'mill', 'oil', 'people', 'expense', 'note'])
    );
  });
});

import { resolveHarvestCaptureFieldId, harvestFieldSelectionMode } from './fieldSelection';
import { getHarvestCapabilities } from './harvestCapabilities';
import { resolveHarvestTotalsLifecycle } from './lifecycleActions';

describe('resolveHarvestCaptureFieldId', () => {
  it('locks the single campaign field instead of API first field', () => {
    expect(
      resolveHarvestCaptureFieldId({
        campaignFieldOrder: ['field-088'],
        preferredFieldId: undefined,
        allowedFieldIds: ['field-088', 'field-089'],
      })
    ).toBe('field-088');
  });

  it('requires explicit pick when multiple fields participate', () => {
    expect(
      resolveHarvestCaptureFieldId({
        campaignFieldOrder: ['field-088', 'field-089'],
        preferredFieldId: undefined,
      })
    ).toBe('');
    expect(harvestFieldSelectionMode(['field-088', 'field-089'])).toBe('required');
  });

  it('prefers preferredFieldId and initial over order', () => {
    expect(
      resolveHarvestCaptureFieldId({
        campaignFieldOrder: ['field-088', 'field-089'],
        preferredFieldId: 'field-088',
      })
    ).toBe('field-088');
    expect(
      resolveHarvestCaptureFieldId({
        campaignFieldOrder: ['field-088', 'field-089'],
        preferredFieldId: 'field-089',
        initialFieldId: 'field-088',
      })
    ).toBe('field-088');
  });
});

describe('getHarvestCapabilities', () => {
  it('hides expense for help access even with money module', () => {
    const caps = getHarvestCapabilities({
      hasAnyFieldAccess: true,
      canOwn: false,
      canWork: true,
      familyModules: new Set(['fields', 'tasks', 'money', 'harvest']),
      accessLevel: 'help',
    });
    expect(caps.canAddExpense).toBe(false);
    expect(caps.captureKinds).not.toContain('expense');
  });

  it('allows expense for owners', () => {
    const caps = getHarvestCapabilities({
      hasAnyFieldAccess: true,
      canOwn: true,
      canWork: true,
    });
    expect(caps.canAddExpense).toBe(true);
    expect(caps.canCompleteSeason).toBe(true);
    expect(caps.canReopenDay).toBe(true);
    expect(caps.captureKinds).toContain('expense');
  });

  it('lets workers reopen a closed harvest day', () => {
    const caps = getHarvestCapabilities({
      hasAnyFieldAccess: true,
      canOwn: false,
      canWork: true,
      familyModules: new Set(['harvest']),
    });
    expect(caps.canCloseDay).toBe(true);
    expect(caps.canReopenDay).toBe(true);
  });

  it('blocks harvest when collaborator lacks harvest module', () => {
    const caps = getHarvestCapabilities({
      hasAnyFieldAccess: true,
      canOwn: false,
      canWork: true,
      familyModules: new Set(['fields', 'tasks']),
      harvestModuleGranted: false,
    });
    expect(caps.canView).toBe(false);
    expect(caps.canUseChronologioHarvest).toBe(false);
  });
});

describe('resolveHarvestTotalsLifecycle', () => {
  it('never maps pause to openComplete', () => {
    expect(resolveHarvestTotalsLifecycle('pause')).toBe('pause');
    expect(resolveHarvestTotalsLifecycle('resume')).toBe('resume');
    expect(resolveHarvestTotalsLifecycle('stop')).toBe('openComplete');
  });
});

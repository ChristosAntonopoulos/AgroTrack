import { resolveHarvestCaptureFieldId, harvestFieldSelectionMode } from './fieldSelection';
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

describe('resolveHarvestTotalsLifecycle', () => {
  it('never maps pause to openComplete', () => {
    expect(resolveHarvestTotalsLifecycle('pause')).toBe('pause');
    expect(resolveHarvestTotalsLifecycle('resume')).toBe('resume');
    expect(resolveHarvestTotalsLifecycle('stop')).toBe('openComplete');
  });
});

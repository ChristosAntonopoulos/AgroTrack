import {
  groupPlanPreviewItems,
  practiceCategoryToStep,
} from './fieldWorkPlanPreview';
import type { FieldWorkPlanPreviewItem } from '../services/fieldWorkService';

const item = (
  code: string,
  status: string,
  category: string
): FieldWorkPlanPreviewItem => ({
  templateCode: code,
  templateName: code,
  eligibilityStatus: status,
  reasonCode: 'x',
  reason: 'reason',
  practiceCategory: category,
});

describe('fieldWorkPlanPreview', () => {
  it('maps practice categories to onboarding steps', () => {
    expect(practiceCategoryToStep('irrigation')).toBe('irrigation');
    expect(practiceCategoryToStep('pruning')).toBe('pruning');
    expect(practiceCategoryToStep('fertilisation')).toBe('fertilisation');
    expect(practiceCategoryToStep('ground_cover')).toBe('groundCover');
    expect(practiceCategoryToStep('pest')).toBe('pest');
    expect(practiceCategoryToStep('analysis')).toBe('analyses');
    expect(practiceCategoryToStep('harvest')).toBe('harvestMonth');
    expect(practiceCategoryToStep('other')).toBe('purpose');
    expect(practiceCategoryToStep(undefined)).toBe('purpose');
  });

  it('groups preview rows in Likely / Only if needed / Not routinely order', () => {
    const groups = groupPlanPreviewItems({
      enabled: [item('T01', 'enabled', 'other')],
      askFirst: [item('T15', 'ask_first', 'irrigation')],
      suppressed: [item('T06', 'suppressed', 'pruning')],
    });
    expect(groups.map((g) => g.key)).toEqual(['enabled', 'askFirst', 'suppressed']);
    expect(groups[0].items).toHaveLength(1);
    expect(groups[1].items[0].templateCode).toBe('T15');
    expect(groups[2].items[0].templateCode).toBe('T06');
  });
});

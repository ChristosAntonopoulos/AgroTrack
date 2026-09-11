import {
  groupPlanPreviewBySeason,
  groupPlanPreviewItems,
  planTaskTone,
  practiceCategoryToStep,
  seasonForMonth,
  skippedPlanItems,
} from './fieldWorkPlanPreview';
import type { FieldWorkPlanPreviewItem } from '../services/fieldWorkService';

const item = (
  code: string,
  status: string,
  category: string,
  extras: Partial<FieldWorkPlanPreviewItem> = {}
): FieldWorkPlanPreviewItem => ({
  templateCode: code,
  templateName: code,
  eligibilityStatus: status,
  reasonCode: extras.reasonCode ?? 'x',
  reason: 'reason',
  practiceCategory: category,
  windowStart: extras.windowStart,
  windowEnd: extras.windowEnd,
  ...extras,
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

  it('groups dated work by season and hides skipped rows from the timeline', () => {
    const items = [
      item('T06', 'enabled', 'pruning', { windowStart: '2026-02-15', windowEnd: '2026-04-15' }),
      item('T15', 'ask_first', 'irrigation', { windowStart: '2026-06-01', windowEnd: '2026-08-31' }),
      item('T21', 'enabled', 'harvest', { windowStart: '2026-11-01', windowEnd: '2027-01-31' }),
      item('T09', 'enabled', 'ground_cover', {
        reasonCode: 'already_completed_this_year',
        windowStart: '2026-03-01',
        windowEnd: '2026-05-31',
      }),
      item('T05', 'suppressed', 'fertilisation', { windowStart: '2026-02-01', windowEnd: '2026-03-15' }),
    ];

    expect(seasonForMonth(2)).toBe('winter');
    expect(seasonForMonth(12)).toBe('autumn');
    expect(planTaskTone(items[3])).toBe('done');
    expect(planTaskTone(items[4])).toBe('skipped');

    const seasons = groupPlanPreviewBySeason(items);
    expect(seasons.map((s) => s.key)).toEqual(['winter', 'spring', 'summer', 'autumn']);
    expect(seasons[0].items.map((i) => i.templateCode)).toEqual(['T06']);
    expect(seasons[1].items.map((i) => i.templateCode)).toEqual(['T09']);
    expect(skippedPlanItems(items).map((i) => i.templateCode)).toEqual(['T05']);
  });
});

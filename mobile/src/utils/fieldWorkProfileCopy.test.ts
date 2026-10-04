import { buildCopyDiffPreview, selectableCopyTargets } from './fieldWorkProfileCopy';
import type { Field } from '../services/fieldService';
import type { FieldWorkProfile } from '../services/fieldWorkService';

const field = (id: string, status: string): Field =>
  ({
    id,
    name: id,
    ownerId: 'o1',
    status: status as Field['status'],
    irrigationStatus: false,
    area: 1,
    createdAt: '',
    updatedAt: '',
    currentLifecycleYear: 'low',
  }) as Field;

const profile = {
  productionPurpose: 'olive_oil',
  pruning: { preferenceMode: 'enabled' },
} as FieldWorkProfile;

describe('fieldWorkProfileCopy', () => {
  it('lists only active fields other than the source', () => {
    const targets = selectableCopyTargets(
      [
        field('a', 'Active'),
        field('b', 'Draft'),
        field('c', 'Archived'),
        field('d', 'Active'),
      ],
      'a'
    );
    expect(targets.map((item) => item.id)).toEqual(['d']);
  });

  it('keeps irrigation, dates, and people off unless asked', () => {
    const rows = buildCopyDiffPreview(profile, {
      copyIrrigation: false,
      copyLastPerformed: false,
      copyAssignments: false,
    });
    expect(rows.find((row) => row.key === 'irrigation')?.included).toBe(false);
    expect(rows.find((row) => row.key === 'lastPerformed')?.included).toBe(false);
    expect(rows.find((row) => row.key === 'assignments')?.included).toBe(false);
    expect(rows.find((row) => row.key === 'pruning')?.included).toBe(true);
  });

  it('includes optional groups when their flags are on', () => {
    const rows = buildCopyDiffPreview(profile, {
      copyIrrigation: true,
      copyLastPerformed: true,
      copyAssignments: true,
    });
    expect(rows.find((row) => row.key === 'irrigation')?.included).toBe(true);
    expect(rows.find((row) => row.key === 'lastPerformed')?.included).toBe(true);
    expect(rows.find((row) => row.key === 'assignments')?.included).toBe(true);
  });
});

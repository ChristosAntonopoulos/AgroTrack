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
  }) as Field;

const emptyPractice = () => ({
  preferenceMode: 'enabled',
  preferenceModeLabel: '',
  frequencyType: 'unknown',
  frequencyTypeLabel: '',
  preferredMonths: [] as number[],
  source: 'unknown',
});

const profile = {
  productionPurpose: 'olive_oil',
  irrigation: { ...emptyPractice(), method: 'drip', decisionMaker: 'self' },
  pruning: emptyPractice(),
  fertilisation: { ...emptyPractice(), decisionMaker: 'self' },
  groundCover: { ...emptyPractice(), methods: [] },
  pestManagement: { ...emptyPractice(), decisionApproach: 'unknown', trapStatus: 'unknown' },
  analysis: { ...emptyPractice(), kinds: [] },
  harvest: { ...emptyPractice(), organizer: 'self', needsMillBooking: 'unknown' },
} as unknown as FieldWorkProfile;

describe('fieldWorkProfileCopy', () => {
  it('lists only Active non-draft fields excluding source', () => {
    const targets = selectableCopyTargets(
      [
        field('a', 'Active'),
        field('b', 'Draft'),
        field('c', 'Archived'),
        field('d', 'Active'),
      ],
      'a'
    );
    expect(targets.map((f) => f.id)).toEqual(['d']);
  });

  it('excludes irrigation and last-performed by default in diff preview', () => {
    const rows = buildCopyDiffPreview(profile, {
      copyIrrigation: false,
      copyLastPerformed: false,
      copyAssignments: false,
    });
    const irrigation = rows.find((r) => r.key === 'irrigation');
    const last = rows.find((r) => r.key === 'lastPerformed');
    const assignments = rows.find((r) => r.key === 'assignments');
    expect(irrigation?.included).toBe(false);
    expect(last?.included).toBe(false);
    expect(assignments?.included).toBe(false);
    expect(rows.find((r) => r.key === 'pruning')?.included).toBe(true);
  });

  it('includes irrigation when flag is on', () => {
    const rows = buildCopyDiffPreview(profile, {
      copyIrrigation: true,
      copyLastPerformed: true,
      copyAssignments: true,
    });
    expect(rows.find((r) => r.key === 'irrigation')?.included).toBe(true);
    expect(rows.find((r) => r.key === 'lastPerformed')?.included).toBe(true);
    expect(rows.find((r) => r.key === 'assignments')?.included).toBe(true);
  });
});

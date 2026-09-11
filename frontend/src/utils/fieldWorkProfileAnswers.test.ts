import { buildWorkProfileAnswerRows } from './fieldWorkProfileAnswers';
import type { FieldWorkProfile } from '../services/fieldWorkService';

const emptyPractice = () => ({
  preferenceMode: 'unknown',
  preferenceModeLabel: '',
  frequencyType: 'unknown',
  frequencyTypeLabel: '',
  preferredMonths: [] as number[],
  source: 'user',
});

const profile = (overrides: Partial<FieldWorkProfile> = {}): FieldWorkProfile =>
  ({
    id: 'p1',
    fieldId: 'f1',
    resultYearCreated: 2026,
    profileVersion: 1,
    onboardingVersion: 1,
    status: 'draft',
    statusLabel: '',
    productionPurpose: 'olive_oil',
    productionPurposeLabel: '',
    irrigation: {
      ...emptyPractice(),
      preferenceMode: 'enabled',
      method: 'drip',
      decisionMaker: 'self',
    },
    pruning: {
      ...emptyPractice(),
      preferenceMode: 'enabled',
      lastPerformedYear: 2025,
    },
    fertilisation: {
      ...emptyPractice(),
      preferenceMode: 'enabled',
      frequencyType: 'times_per_year',
      frequencyValue: 1,
      decisionMaker: 'agronomist',
    },
    groundCover: {
      ...emptyPractice(),
      preferenceMode: 'enabled',
      methods: ['mower_or_mulcher'],
      preferredMonths: [4, 10],
    },
    pestManagement: {
      ...emptyPractice(),
      decisionApproach: 'trap_and_fruit_checks',
      trapStatus: 'active',
    },
    analysis: {
      ...emptyPractice(),
      preferenceMode: 'enabled',
      kinds: [{ kind: 'soil', lastPerformedYear: 2024 }],
    },
    harvest: {
      ...emptyPractice(),
      expectedStartMonth: 11,
      organizer: 'collaborator_or_family',
      needsMillBooking: 'yes',
    },
    defaultAssignments: { entries: [] },
    notificationPreference: {
      intensity: 'decisions_and_upcoming',
      intensityLabel: '',
      acceptedTaskReminderDaysBefore: 3,
    },
    currentYearDeclaredWork: [
      {
        category: 'fertilisation',
        templateCode: 'T09',
        resultYear: 2026,
        completion: 'yes',
        source: 'user',
      },
    ],
    createdByUserId: 'u1',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }) as FieldWorkProfile;

describe('buildWorkProfileAnswerRows', () => {
  const label = (key: string, params?: Record<string, string | number>) => {
    if (params?.year) return `${key}:${params.year}`;
    return key.replace('tasks:fieldWork.onboarding.choices.', '');
  };

  it('turns the grower answers into short readable cards', () => {
    const rows = buildWorkProfileAnswerRows(profile(), label);
    expect(rows.map((r) => r.id)).toEqual([
      'purpose',
      'irrigation',
      'pruning',
      'fertilisation',
      'groundCover',
      'pest',
      'analyses',
      'harvest',
      'reminders',
    ]);
    expect(rows[0].lines[0]).toContain('purpose.oil');
    expect(rows[1].lines.join(' ')).toContain('irrigationMethod.drip');
    expect(rows[3].lines.join(' ')).toContain('planPreview.answers.doneThisYear');
    expect(rows[7].lines[0]).toContain('months.11');
    expect(rows[8].lines[0]).toContain('reminders.upcoming');
  });

  it('returns empty when there is no profile', () => {
    expect(buildWorkProfileAnswerRows(null, label)).toEqual([]);
  });
});

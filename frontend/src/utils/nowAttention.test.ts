import type { FieldTask } from '../services/fieldWorkService';
import { buildAttentionItems, buildNowBuckets } from './nowAttention';

const base = (overrides: Partial<FieldTask>): FieldTask =>
  ({
    id: 't1',
    fieldId: 'f1',
    resultYear: 2026,
    title: 'Έλεγχος δάκου',
    status: 'planned',
    statusLabel: 'Προγραμματισμένη',
    additionalParticipantUserIds: [],
    assignmentResponse: 'pending',
    checklist: [],
    attachmentIds: [],
    weatherSuitability: 'unknown',
    weatherSuitabilityLabel: '',
    createdByUserId: 'u1',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    ...overrides,
  }) as FieldTask;

describe('nowAttention', () => {
  const now = new Date('2026-09-11T12:00:00+03:00');

  it('flags overdue planned tasks', () => {
    const items = buildAttentionItems(
      [base({ id: 'over', plannedStart: '2026-09-01', plannedEnd: '2026-09-05' })],
      now
    );
    expect(items[0]?.reasonId).toBe('overdue');
  });

  it('puts in-progress and today into separate buckets', () => {
    const buckets = buildNowBuckets(
      [
        base({ id: 'ip', status: 'in_progress', updatedAt: '2026-09-11T08:00:00Z' }),
        base({
          id: 'td',
          plannedStart: '2026-09-11',
          plannedEnd: '2026-09-11',
          assignedUserId: 'u1',
        }),
        base({
          id: 'wk',
          plannedStart: '2026-09-12',
          plannedEnd: '2026-09-12',
          assignedUserId: 'u1',
        }),
      ],
      now
    );
    expect(buckets.inProgress.map((t) => t.id)).toContain('ip');
    expect(buckets.today.map((t) => t.id)).toContain('td');
    expect(buckets.thisWeekPreview.map((t) => t.id)).toContain('wk');
  });

  it('treats paused in-progress as attention', () => {
    const items = buildAttentionItems(
      [base({ id: 'p', status: 'in_progress', isPaused: true, pauseReason: 'weather' })],
      now
    );
    expect(items[0]?.reasonId).toBe('paused');
  });
});

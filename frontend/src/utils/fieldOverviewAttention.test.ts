import type { FieldEnvironmentalAlert } from '../services/geospatialService';
import type { FieldTask, TaskProposal } from '../services/fieldWorkService';
import { resolveFieldAttention } from './fieldOverviewAttention';

const now = new Date('2026-09-10T10:00:00');

const task = (overrides: Partial<FieldTask>): FieldTask =>
  ({
    id: 'task-1',
    fieldId: 'f1',
    resultYear: 2026,
    title: 'Κλάδεμα',
    status: 'planned',
    statusLabel: 'Προγραμματισμένη',
    additionalParticipantUserIds: [],
    assignmentResponse: 'pending',
    checklist: [],
    attachmentIds: [],
    weatherSuitability: 'unknown',
    weatherSuitabilityLabel: '',
    createdByUserId: 'u1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as FieldTask;

const proposal = (overrides: Partial<TaskProposal> = {}): TaskProposal => ({
  id: 'p1',
  fieldId: 'f1',
  resultYear: 2026,
  templateCode: 'pruning',
  templateVersion: 1,
  sourceType: 'rule',
  sourceTypeLabel: 'Κανόνας',
  generatedAt: '2026-09-01T00:00:00Z',
  confidence: 'medium',
  confidenceLabel: 'Μέτρια',
  reasonCodes: [],
  explanation: 'Consider pruning',
  greekExplanation: 'Εξετάστε κλάδεμα',
  status: 'pending',
  statusLabel: 'Ανοιχτή',
  ...overrides,
});

const alert = (overrides: Partial<FieldEnvironmentalAlert>): FieldEnvironmentalAlert => ({
  id: 'a1',
  alertType: 'frost',
  severity: 'high',
  title: 'Παγετός',
  message: 'Κίνδυνος παγετού τη νύχτα',
  confidence: 'medium',
  ...overrides,
});

describe('resolveFieldAttention', () => {
  it('does not recommend work on a draft field', () => {
    const result = resolveFieldAttention({
      isDraft: true,
      isHistoricalYear: false,
      alerts: [alert({})],
      tasks: [task({ plannedEnd: '2026-09-01' })],
      proposals: [proposal()],
      now,
    });
    expect(result.kind).toBe('none');
    expect(result.id).toBe('draft');
  });

  it('puts a safety alert before overdue work', () => {
    const result = resolveFieldAttention({
      isDraft: false,
      isHistoricalYear: false,
      alerts: [alert({ alertType: 'frost', severity: 'critical', title: 'Παγετός' })],
      tasks: [task({ plannedEnd: '2026-09-01', title: 'Εκπρόθεσμη' })],
      proposals: [],
      now,
    });
    expect(result.kind).toBe('safety');
    expect(result.title).toBe('Παγετός');
  });

  it('puts overdue work before the next planned task', () => {
    const result = resolveFieldAttention({
      isDraft: false,
      isHistoricalYear: false,
      alerts: [],
      tasks: [
        task({ id: 'late', title: 'Εκπρόθεσμη', plannedEnd: '2026-09-01' }),
        task({ id: 'next', title: 'Επόμενη', plannedStart: '2026-09-20', plannedEnd: '2026-09-22' }),
      ],
      proposals: [],
      now,
    });
    expect(result.kind).toBe('overdue');
    expect(result.title).toBe('Εκπρόθεσμη');
  });

  it('offers a weather reschedule without changing the date', () => {
    const result = resolveFieldAttention({
      isDraft: false,
      isHistoricalYear: false,
      alerts: [],
      tasks: [
        task({
          id: 'spray',
          title: 'Ψεκασμός',
          plannedStart: '2026-09-12',
          plannedEnd: '2026-09-14',
          weatherSuitability: 'unsuitable',
          weatherSuitabilityLabel: 'Ακατάλληλος καιρός',
        }),
      ],
      proposals: [],
      now,
    });
    expect(result.kind).toBe('weatherReschedule');
    expect(result.primaryTo).toBe('/tasks/spray');
    expect(result.secondaryKey).toBe('overview.attention.keepDate');
  });

  it('does not treat old alerts or weather as active in a past year', () => {
    const result = resolveFieldAttention({
      isDraft: false,
      isHistoricalYear: true,
      alerts: [alert({ title: 'Παλιός παγετός' })],
      tasks: [
        task({
          id: 'next',
          title: 'Λίπανση 2025',
          plannedStart: '2026-09-20',
          plannedEnd: '2026-09-22',
          weatherSuitability: 'caution',
        }),
      ],
      proposals: [],
      now,
    });
    expect(result.kind).toBe('nextTask');
    expect(result.title).toBe('Λίπανση 2025');
  });

  it('falls through to none when there is nothing open', () => {
    const result = resolveFieldAttention({
      isDraft: false,
      isHistoricalYear: false,
      alerts: [],
      tasks: [task({ status: 'completed' })],
      proposals: [proposal({ status: 'dismissed' })],
      now,
    });
    expect(result.kind).toBe('none');
    expect(result.id).toBe('none');
  });
});

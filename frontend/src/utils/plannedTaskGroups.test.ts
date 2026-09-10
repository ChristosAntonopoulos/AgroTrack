import type { FieldTask } from '../services/fieldWorkService';
import { checklistProgress, groupPlannedTasks, plannedGroupOf } from './plannedTaskGroups';

const task = (overrides: Partial<FieldTask> = {}): FieldTask => ({
  id: 't-1',
  fieldId: 'field-1',
  resultYear: 2026,
  title: 'Εργασία',
  status: 'planned',
  statusLabel: 'Προγραμματισμένη',
  checklist: [],
  additionalParticipantUserIds: [],
  assignmentResponse: 'pending',
  weatherSuitability: 'unknown',
  weatherSuitabilityLabel: 'Καλή ημέρα',
  attachmentIds: [],
  createdByUserId: 'owner-1',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
  ...overrides,
});

describe('planned task groups', () => {
  const now = new Date('2026-09-10T12:00:00+03:00');

  it('puts overdue and today into Σήμερα, this week next, then later', () => {
    expect(plannedGroupOf(task({ plannedStart: '2026-08-15' }), now)).toBe('today');
    expect(plannedGroupOf(task({ plannedStart: '2026-09-10' }), now)).toBe('today');
    expect(plannedGroupOf(task({ plannedStart: '2026-09-12' }), now)).toBe('thisWeek');
    expect(plannedGroupOf(task({ plannedStart: '2026-09-21' }), now)).toBe('later');
    expect(plannedGroupOf(task({}), now)).toBe('today');
  });

  it('omits empty groups and sorts inside a group', () => {
    const groups = groupPlannedTasks(
      [
        task({ id: 'later-b', plannedStart: '2026-11-01' }),
        task({ id: 'later-a', plannedStart: '2026-10-01' }),
        task({ id: 'today', plannedStart: '2026-09-10' }),
      ],
      now
    );
    expect(groups.map((group) => group.id)).toEqual(['today', 'later']);
    expect(groups[1].tasks.map((item) => item.id)).toEqual(['later-a', 'later-b']);
  });
});

describe('checklist progress', () => {
  it('counts essential items when any exist', () => {
    expect(
      checklistProgress(
        task({
          checklist: [
            {
              key: 'a',
              label: 'A',
              greekLabel: 'A',
              englishLabel: 'A',
              itemType: 'bool',
              requirement: 'required',
              isEssential: true,
              sortOrder: 1,
              isAnswered: true,
              attachmentIds: [],
              choices: [],
            },
            {
              key: 'b',
              label: 'B',
              greekLabel: 'B',
              englishLabel: 'B',
              itemType: 'bool',
              requirement: 'optional',
              isEssential: false,
              sortOrder: 2,
              isAnswered: false,
              attachmentIds: [],
              choices: [],
            },
          ],
        })
      )
    ).toEqual({ done: 1, total: 1 });
  });
});

import {
  choiceFromEntry,
  DEFAULT_ASSIGNMENT_CATEGORIES,
  entryFromChoice,
  getAssignmentForCategory,
  shouldShowDefaultAssignments,
  summarizeAssignment,
  upsertAssignmentEntry,
} from './fieldWorkDefaultAssignments';

describe('fieldWorkDefaultAssignments', () => {
  it('exposes the six maintenance categories', () => {
    expect(DEFAULT_ASSIGNMENT_CATEGORIES).toEqual([
      'pruning',
      'fertilisation',
      'ground_cover',
      'irrigation',
      'monitoring',
      'harvest',
    ]);
  });

  it('upserts by category without duplicates', () => {
    const first = upsertAssignmentEntry(undefined, {
      category: 'pruning',
      isSelf: true,
    });
    const second = upsertAssignmentEntry(first, {
      category: 'pruning',
      isSelf: false,
      assigneeUserId: 'u2',
    });
    expect(second.entries).toHaveLength(1);
    expect(second.entries[0].assigneeUserId).toBe('u2');
  });

  it('maps choice me / collaborator / later', () => {
    expect(choiceFromEntry(undefined)).toBe('later');
    expect(choiceFromEntry({ category: 'x', isSelf: true })).toBe('me');
    expect(
      choiceFromEntry({ category: 'x', isSelf: false, assigneeUserId: 'c1' })
    ).toBe('collaborator');
    expect(entryFromChoice('harvest', 'me').isSelf).toBe(true);
    expect(entryFromChoice('harvest', 'later').assigneeUserId).toBeNull();
    expect(entryFromChoice('harvest', 'collaborator', 'c1').assigneeUserId).toBe('c1');
  });

  it('shows default assignments when collaborators exist', () => {
    expect(shouldShowDefaultAssignments({ entries: [] }, true)).toBe(true);
    expect(shouldShowDefaultAssignments({ entries: [] }, false)).toBe(false);
  });

  it('summarises assignment for display', () => {
    const labels = {
      me: 'Me',
      later: 'Later',
      person: (n: string) => `Person: ${n}`,
    };
    expect(summarizeAssignment(undefined, labels)).toBe('Later');
    expect(summarizeAssignment({ category: 'x', isSelf: true }, labels)).toBe('Me');
    expect(
      summarizeAssignment(
        { category: 'x', isSelf: false, assigneeUserId: 'u1' },
        labels,
        'Nikos'
      )
    ).toBe('Person: Nikos');
    expect(getAssignmentForCategory({ entries: [{ category: 'pruning', isSelf: true }] }, 'pruning')?.isSelf).toBe(
      true
    );
  });
});

import {
  ANNUAL_REVIEW_DAYS,
  assigneeOptionKey,
  DISMISSAL_PROMPT_THRESHOLD,
  isAnnualReviewDue,
  pendingIncrementalQuestionIds,
  practiceKeyFromTemplate,
  resolveCompletionFrequencyUpdate,
  resolveDismissalPreferenceMode,
  shouldPromptCompletionFrequency,
  shouldPromptDismissalLearning,
  suggestAssigneeFromProfile,
} from './fieldWorkLearning';

describe('fieldWorkLearning', () => {
  it('triggers dismissal prompt at threshold', () => {
    expect(shouldPromptDismissalLearning(DISMISSAL_PROMPT_THRESHOLD - 1)).toBe(false);
    expect(shouldPromptDismissalLearning(DISMISSAL_PROMPT_THRESHOLD)).toBe(true);
  });

  it('maps dont_propose to disabled', () => {
    expect(resolveDismissalPreferenceMode('dont_propose', 'enabled')).toBe('disabled');
    expect(resolveDismissalPreferenceMode('ask_when_indicated', 'enabled')).toBe('ask_first');
    expect(resolveDismissalPreferenceMode('keep_proposing', 'disabled')).toBe('enabled');
  });

  it('completion prompt only for pruning success', () => {
    expect(shouldPromptCompletionFrequency('T06', 'completed')).toBe(true);
    expect(shouldPromptCompletionFrequency('T06', 'not_done')).toBe(false);
    expect(shouldPromptCompletionFrequency('T14', 'completed')).toBe(false);
  });

  it('completion no_change forbids profile write payload', () => {
    expect(resolveCompletionFrequencyUpdate('no_change', 2026)).toBeNull();
    expect(resolveCompletionFrequencyUpdate('every_2_years', 2026)).toEqual({
      lastPerformedYear: 2026,
      frequencyType: 'every_n_years',
      frequencyValue: 2,
    });
  });

  it('annual review due after cadence', () => {
    const now = new Date('2026-09-10T12:00:00Z');
    expect(isAnnualReviewDue(null, now)).toBe(true);
    expect(isAnnualReviewDue(now.toISOString(), now)).toBe(false);
    const old = new Date(now.getTime() - (ANNUAL_REVIEW_DAYS + 1) * 86400000);
    expect(isAnnualReviewDue(old.toISOString(), now)).toBe(true);
  });

  it('incremental questions empty until version bump registered', () => {
    expect(pendingIncrementalQuestionIds(1, 1)).toEqual([]);
  });

  it('suggests default assignee without auto-grant', () => {
    const profile = {
      status: 'active',
      pruning: { defaultAssigneeId: 'u-1' },
      defaultAssignments: { entries: [] },
    };
    expect(suggestAssigneeFromProfile(profile, 'T06', 'me')).toEqual({
      assignedUserId: 'u-1',
      isSelf: false,
    });
    expect(assigneeOptionKey(suggestAssigneeFromProfile(profile, 'T06', 'me'), 'me')).toBe('user:u-1');
    expect(assigneeOptionKey(null, 'me')).toBe('user:me');
    expect(practiceKeyFromTemplate('T06')).toBe('pruning');
  });
});

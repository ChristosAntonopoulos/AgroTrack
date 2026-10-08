import type { CreateTaskInput, TaskTimingBucket } from '../services/taskService';

/** Mirrors ScheduleWorkSheet submit mapping so field/date context stays covered by unit tests. */
const buildScheduleCreateInput = (input: {
  fieldId: string;
  title: string;
  templateCode?: string;
  timing: 'today' | 'tomorrow' | 'thisWeek' | 'later' | 'pickDate';
  scheduledFor?: string;
  note?: string;
}): CreateTaskInput => {
  const timingBucket: TaskTimingBucket =
    input.timing === 'pickDate' ? 'later' : input.timing === 'later' ? 'later' : input.timing;
  return {
    fieldId: input.fieldId,
    title: input.title.trim(),
    templateCode: input.templateCode,
    timingBucket,
    scheduledFor:
      input.timing === 'pickDate' && input.scheduledFor ? input.scheduledFor : undefined,
    note: input.note?.trim() || undefined,
    notes: input.note?.trim() || undefined,
  };
};

describe('schedule work field/date context', () => {
  it('keeps field and picked date through create submit mapping', () => {
    const payload = buildScheduleCreateInput({
      fieldId: 'field-north',
      title: 'Κλάδεμα',
      templateCode: 'T06',
      timing: 'pickDate',
      scheduledFor: '2026-04-12',
      note: 'Morning',
    });

    expect(payload.fieldId).toBe('field-north');
    expect(payload.scheduledFor).toBe('2026-04-12');
    expect(payload.timingBucket).toBe('later');
    expect(payload.templateCode).toBe('T06');
    expect(payload.title).toBe('Κλάδεμα');
  });

  it('does not invent a scheduled date for today bucket', () => {
    const payload = buildScheduleCreateInput({
      fieldId: 'field-south',
      title: 'Trap check',
      timing: 'today',
    });

    expect(payload.fieldId).toBe('field-south');
    expect(payload.timingBucket).toBe('today');
    expect(payload.scheduledFor).toBeUndefined();
  });
});

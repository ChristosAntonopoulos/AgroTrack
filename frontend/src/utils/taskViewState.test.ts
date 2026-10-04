import {
  buildTaskSearchParams,
  DEFAULT_TASK_VIEW,
  parseTaskFieldId,
  parseTaskView,
  parseTaskYear,
} from './taskViewState';

describe('task view URL state', () => {
  it('defaults to to-do and remaps legacy views', () => {
    expect(parseTaskView(null)).toBe('todo');
    expect(DEFAULT_TASK_VIEW).toBe('todo');
    expect(parseTaskView('todo')).toBe('todo');
    expect(parseTaskView('done')).toBe('done');
    expect(parseTaskView('now')).toBe('todo');
    expect(parseTaskView('upcoming')).toBe('todo');
    expect(parseTaskView('proposals')).toBe('todo');
    expect(parseTaskView('planned')).toBe('todo');
    expect(parseTaskView('active')).toBe('todo');
    expect(parseTaskView('history')).toBe('done');
    expect(parseTaskView('completed')).toBe('done');
  });

  it('parses a result year only when it is a plausible calendar year', () => {
    expect(parseTaskYear('2026', 2025)).toBe(2026);
    expect(parseTaskYear('nope', 2026)).toBe(2026);
    expect(parseTaskYear('12', 2026)).toBe(2026);
  });

  it('treats empty field as all fields', () => {
    expect(parseTaskFieldId(null)).toBe('');
    expect(parseTaskFieldId(' field-1 ')).toBe('field-1');
  });

  it('writes view; year only when non-default; field when selected', () => {
    const params = buildTaskSearchParams({
      view: 'todo',
      year: 2026,
      defaultYear: 2026,
      fieldId: '',
    });
    expect(params.get('view')).toBe('todo');
    expect(params.get('year')).toBeNull();
    expect(params.get('fieldId')).toBeNull();

    const filtered = buildTaskSearchParams({
      view: 'done',
      year: 2025,
      defaultYear: 2026,
      fieldId: 'field-2',
    });
    expect(filtered.toString()).toBe('view=done&year=2025&fieldId=field-2');
  });
});

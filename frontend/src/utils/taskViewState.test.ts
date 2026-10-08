import {
  buildTaskSearchParams,
  DEFAULT_TASK_VIEW,
  parseTaskFieldId,
  parseTaskView,
} from './taskViewState';

describe('task view URL state', () => {
  it('defaults to today and remaps legacy views', () => {
    expect(parseTaskView(null)).toBe('today');
    expect(DEFAULT_TASK_VIEW).toBe('today');
    expect(parseTaskView('today')).toBe('today');
    expect(parseTaskView('upcoming')).toBe('upcoming');
    expect(parseTaskView('done')).toBe('done');
    expect(parseTaskView('todo')).toBe('today');
    expect(parseTaskView('now')).toBe('today');
    expect(parseTaskView('proposals')).toBe('today');
    expect(parseTaskView('planned')).toBe('upcoming');
    expect(parseTaskView('active')).toBe('today');
    expect(parseTaskView('history')).toBe('done');
    expect(parseTaskView('completed')).toBe('done');
  });

  it('treats empty field as all fields', () => {
    expect(parseTaskFieldId(null)).toBe('');
    expect(parseTaskFieldId(' field-1 ')).toBe('field-1');
  });

  it('writes view and field when selected', () => {
    const params = buildTaskSearchParams({
      view: 'today',
      fieldId: '',
    });
    expect(params.get('view')).toBe('today');
    expect(params.get('fieldId')).toBeNull();

    const filtered = buildTaskSearchParams({
      view: 'done',
      fieldId: 'field-2',
    });
    expect(filtered.toString()).toBe('view=done&fieldId=field-2');
  });

  it('can open the schedule flow via query', () => {
    const params = buildTaskSearchParams({
      view: 'today',
      fieldId: 'field-1',
      schedule: true,
      templateCode: 'T06',
    });
    expect(params.get('schedule')).toBe('1');
    expect(params.get('templateCode')).toBe('T06');
  });
});

import {
  buildTaskSearchParams,
  DEFAULT_TASK_VIEW,
  parseTaskFieldId,
  parseTaskView,
  parseTaskYear,
} from './taskViewState';

describe('task view URL state', () => {
  it('defaults to now and remaps legacy views', () => {
    expect(parseTaskView(null)).toBe('now');
    expect(DEFAULT_TASK_VIEW).toBe('now');
    expect(parseTaskView('now')).toBe('now');
    expect(parseTaskView('upcoming')).toBe('upcoming');
    expect(parseTaskView('proposals')).toBe('proposals');
    expect(parseTaskView('history')).toBe('history');
    expect(parseTaskView('planned')).toBe('upcoming');
    expect(parseTaskView('active')).toBe('now');
    expect(parseTaskView('completed')).toBe('now');
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
      view: 'upcoming',
      year: 2026,
      defaultYear: 2026,
      fieldId: '',
    });
    expect(params.get('view')).toBe('upcoming');
    expect(params.get('year')).toBeNull();
    expect(params.get('field')).toBeNull();

    const filtered = buildTaskSearchParams({
      view: 'proposals',
      year: 2025,
      defaultYear: 2026,
      fieldId: 'field-2',
    });
    expect(filtered.toString()).toBe('view=proposals&year=2025&field=field-2');
  });
});

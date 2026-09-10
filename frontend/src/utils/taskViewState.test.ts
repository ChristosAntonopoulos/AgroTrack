import {
  buildTaskSearchParams,
  parseTaskFieldId,
  parseTaskView,
  parseTaskYear,
} from './taskViewState';

describe('task view URL state', () => {
  it('defaults to proposals and rejects unknown views', () => {
    expect(parseTaskView(null)).toBe('proposals');
    expect(parseTaskView('planned')).toBe('planned');
    expect(parseTaskView('active')).toBe('active');
    expect(parseTaskView('completed')).toBe('proposals');
    expect(parseTaskView('status=in_progress')).toBe('proposals');
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

  it('writes view and year, and field only when a field is selected', () => {
    const params = buildTaskSearchParams({
      view: 'planned',
      year: 2026,
      defaultYear: 2026,
      fieldId: '',
    });
    expect(params.get('view')).toBe('planned');
    expect(params.get('year')).toBe('2026');
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

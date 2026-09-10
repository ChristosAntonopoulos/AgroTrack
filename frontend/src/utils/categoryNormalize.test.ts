import { normalizeTaskCategory, normalizeTaskStatus } from './categoryNormalize';

describe('category and status normalization', () => {
  it('groups Greek and English irrigation aliases', () => {
    expect(normalizeTaskCategory('irrigation')).toBe('irrigation');
    expect(normalizeTaskCategory('Άρδευση')).toBe('irrigation');
    expect(normalizeTaskCategory('άρδευση')).toBe('irrigation');
  });

  it('groups harvest and pruning aliases', () => {
    expect(normalizeTaskCategory('harvest')).toBe('harvest');
    expect(normalizeTaskCategory('Συγκομιδή')).toBe('harvest');
    expect(normalizeTaskCategory('pruning')).toBe('pruning');
    expect(normalizeTaskCategory('Κλάδεμα')).toBe('pruning');
  });

  it('falls back safely for unknown values', () => {
    expect(normalizeTaskCategory('something-new')).toBe('other');
    expect(normalizeTaskStatus('nope')).toBeNull();
    expect(normalizeTaskStatus('Completed')).toBe('completed');
    expect(normalizeTaskStatus('in progress')).toBe('in_progress');
  });
});

import { groupSameDayPhotoEntries, isChronologioPhotoEntry } from './chronologioPhotoGroups';
import type { ChronologioEntry } from '../services/chronologioService';

describe('groupSameDayPhotoEntries', () => {
  const photo = (id: string): ChronologioEntry =>
    ({
      id,
      category: 'photo',
      sourceType: 'Photo',
      sourceId: id,
      title: `Photo ${id}`,
      summary: '',
      occurredAt: '2026-09-11T10:00:00Z',
      fieldId: 'f1',
      media: [{ id: `m-${id}`, type: 'image', url: `/p/${id}.jpg` }],
      details: {},
    }) as unknown as ChronologioEntry;

  const task = (id: string): ChronologioEntry =>
    ({
      id,
      category: 'task',
      sourceType: 'Task',
      sourceId: id,
      title: `Task ${id}`,
      summary: '',
      occurredAt: '2026-09-11T11:00:00Z',
      fieldId: 'f1',
      media: [],
      details: { task: { taskId: id, status: 'done' } },
    }) as unknown as ChronologioEntry;

  it('leaves a single photo as a normal entry', () => {
    const items = groupSameDayPhotoEntries([photo('a')]);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ type: 'entry', entry: expect.objectContaining({ id: 'a' }) });
  });

  it('collapses multiple photos into one group at first photo position', () => {
    const items = groupSameDayPhotoEntries([task('t1'), photo('a'), task('t2'), photo('b'), photo('c')]);
    expect(items.map((i) => i.type)).toEqual(['entry', 'photoGroup', 'entry']);
    if (items[1].type !== 'photoGroup') throw new Error('expected photo group');
    expect(items[1].entries.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('detects photo entries by category or sourceType', () => {
    expect(isChronologioPhotoEntry(photo('x'))).toBe(true);
    expect(isChronologioPhotoEntry(task('y'))).toBe(false);
  });
});

import { linkedRecordLabel, linkedRecordPath } from '../components/photos/photoLinks';
import type { Photo } from '../services/photoService';
import { formatPhotoCardDate } from './localeFormatters';

const basePhoto = (overrides: Partial<Photo> = {}): Photo =>
  ({
    id: 'p1',
    ownerType: 'field',
    ownerId: '',
    fieldId: 'f1',
    mediaType: 'image',
    url: '/x.jpg',
    uploadedByUserId: 'u1',
    effectiveCapturedAt: '2024-06-15T10:00:00Z',
    fieldAssignment: 'manual',
    kind: 'general',
    isLinked: false,
    createdAt: '2024-06-15T10:00:00Z',
    updatedAt: '2024-06-15T10:00:00Z',
    ...overrides,
  }) as Photo;

describe('linkedRecordPath', () => {
  it('routes tasks, harvests, notes, and phenology', () => {
    expect(
      linkedRecordPath(basePhoto({ isLinked: true, ownerType: 'task', ownerId: 't1' }))
    ).toBe('/tasks/t1');
    expect(
      linkedRecordPath(
        basePhoto({ isLinked: true, ownerType: 'harvest', ownerId: 'h1', fieldId: 'f1' })
      )
    ).toContain('harvestId=h1');
    expect(
      linkedRecordPath(basePhoto({ isLinked: true, ownerType: 'note', ownerId: 'n1' }))
    ).toContain('Note%3An1');
    expect(
      linkedRecordPath(basePhoto({ isLinked: true, ownerType: 'phenology', ownerId: 'ph1' }))
    ).toContain('Phenology%3Aph1');
  });

  it('returns null when not linked', () => {
    expect(linkedRecordPath(basePhoto())).toBeNull();
  });
});

describe('linkedRecordLabel', () => {
  it('prefers type + title when title exists', () => {
    expect(
      linkedRecordLabel(
        basePhoto({ isLinked: true, ownerType: 'task', linkedTitle: 'Pruning' }),
        () => 'Task'
      )
    ).toBe('Task: Pruning');
  });

  it('falls back to type alone', () => {
    expect(
      linkedRecordLabel(basePhoto({ isLinked: true, ownerType: 'task' }), () => 'Task')
    ).toBe('Task');
  });
});

describe('formatPhotoCardDate', () => {
  it('honors the workspace date format preference', () => {
    expect(
      formatPhotoCardDate('2024-06-15T10:00:00Z', { locale: 'en', dateFormat: 'yyyy-MM-dd' })
    ).toBe('2024-06-15');
    expect(
      formatPhotoCardDate('2024-06-15T10:00:00Z', { locale: 'el', dateFormat: 'dd/MM/yyyy' })
    ).toMatch(/15[/.-]06[/.-]2024/);
  });
});

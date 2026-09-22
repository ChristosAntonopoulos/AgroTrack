import { classifyPhotoFile, PHOTO_MAX_BYTES } from './photoUploadRules';
import { daysUntilPurge, localizeLinkedStatus } from './photoLabels';

describe('classifyPhotoFile', () => {
  it('accepts jpeg, png, webp, and gif', () => {
    expect(classifyPhotoFile({ name: 'a.jpg', type: 'image/jpeg', size: 100 })).toBeNull();
    expect(classifyPhotoFile({ name: 'a.png', type: 'image/png', size: 100 })).toBeNull();
    expect(classifyPhotoFile({ name: 'a.webp', type: 'image/webp', size: 100 })).toBeNull();
    expect(classifyPhotoFile({ name: 'a.gif', type: 'image/gif', size: 100 })).toBeNull();
  });

  it('rejects HEIC, oversized, and unknown files with a specific reason', () => {
    expect(classifyPhotoFile({ name: 'iphone.HEIC', type: '', size: 100 })).toBe('heic');
    expect(classifyPhotoFile({ name: 'big.jpg', type: 'image/jpeg', size: PHOTO_MAX_BYTES + 1 })).toBe(
      'oversize'
    );
    expect(classifyPhotoFile({ name: 'notes.pdf', type: 'application/pdf', size: 100 })).toBe(
      'unsupported'
    );
  });
});

describe('localizeLinkedStatus', () => {
  const t = (key: string) => (key === 'common:taskStatus.completed' ? 'Ολοκληρώθηκε' : key);

  it('translates raw English task status', () => {
    expect(localizeLinkedStatus('completed', t)).toBe('Ολοκληρώθηκε');
  });

  it('hides unknown English enums', () => {
    expect(localizeLinkedStatus('mystery', t)).toBeNull();
  });
});

describe('daysUntilPurge', () => {
  it('counts remaining retention days', () => {
    const deletedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(daysUntilPurge(deletedAt, 30)).toBe(28);
  });
});

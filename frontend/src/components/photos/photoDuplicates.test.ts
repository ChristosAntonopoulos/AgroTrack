import { isPhotoDuplicate, type HashCapture } from './photoDuplicates';

describe('isPhotoDuplicate', () => {
  const hash = 'a'.repeat(64);
  const created = '2024-06-01T08:00:00.000Z';
  const captured = '2024-06-01T10:00:00.000Z';

  it('matches the same hash and capture time', () => {
    const incoming: HashCapture = { contentHash: hash, capturedAt: captured };
    const existing: HashCapture = { contentHash: hash, capturedAt: captured, createdAt: created };
    expect(isPhotoDuplicate(incoming, existing)).toBe(true);
  });

  it('does not match when capture times differ', () => {
    const incoming: HashCapture = { contentHash: hash, capturedAt: '2024-06-01T12:00:00.000Z' };
    const existing: HashCapture = { contentHash: hash, capturedAt: captured, createdAt: created };
    expect(isPhotoDuplicate(incoming, existing)).toBe(false);
  });

  it('matches on hash when capture time was only the upload clock', () => {
    const incoming: HashCapture = { contentHash: hash, capturedAt: null };
    const existing: HashCapture = { contentHash: hash, capturedAt: created, createdAt: created };
    expect(isPhotoDuplicate(incoming, existing)).toBe(true);
  });

  it('does not treat upload-time effectiveCapturedAt as EXIF on the library side', () => {
    const incoming: HashCapture = {
      contentHash: hash,
      capturedAt: '2024-06-01T12:00:00.000Z',
    };
    // Server ignores captured≈created; client must pass createdAt so the same rule applies.
    const existing: HashCapture = {
      contentHash: hash,
      capturedAt: created,
      createdAt: created,
    };
    expect(isPhotoDuplicate(incoming, existing)).toBe(true);
  });
});

import { isRealChronologioMediaUrl, pickRealMediaUrl } from './mediaGuard';

describe('isRealChronologioMediaUrl', () => {
  it('keeps signed photo content urls', () => {
    const signed =
      '/api/v1/photos/abc/content?variant=thumb&exp=1&uid=user&sig=deadbeef';
    expect(isRealChronologioMediaUrl(signed)).toBe(true);
    expect(pickRealMediaUrl([signed])).toBe(signed);
  });

  it('keeps uploads paths and drops stock photography', () => {
    expect(isRealChronologioMediaUrl('/uploads/photos/2026/10/a.jpg')).toBe(true);
    expect(isRealChronologioMediaUrl('https://images.unsplash.com/photo.jpg')).toBe(false);
    expect(pickRealMediaUrl([null, 'https://picsum.photos/1', '/uploads/a.jpg'])).toBe(
      '/uploads/a.jpg'
    );
  });
});

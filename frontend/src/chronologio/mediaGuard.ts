/** True only for app-hosted /uploads media — never stock photography. */
export const isRealChronologioMediaUrl = (url?: string | null): boolean => {
  if (!url || !url.trim()) return false;
  const u = url.trim().toLowerCase();
  if (u.includes('unsplash.com') || u.includes('placeholder') || u.includes('picsum')) {
    return false;
  }
  return (
    u.startsWith('/uploads/') ||
    u.includes('/uploads/') ||
    u.startsWith('blob:') ||
    u.startsWith('data:image/')
  );
};

export const pickRealMediaUrl = (
  urls: Array<string | null | undefined>
): string | undefined => {
  for (const u of urls) {
    if (isRealChronologioMediaUrl(u)) return u!;
  }
  return undefined;
};

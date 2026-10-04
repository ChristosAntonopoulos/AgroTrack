export const CHRONOLOGIO_HOME = '/chronologio';
export const CHRONOLOGIO_TODAY = '/chronologio?focus=today';

const pathnameOf = (path: string) => path.split('?')[0].replace(/^\//, '').replace(/\/$/, '');

/** Legacy morning-view and home URLs become Chronologio. */
export const migrateLegacyHomePath = (path?: string | null): string => {
  if (!path) return CHRONOLOGIO_HOME;
  const [pathname, search = ''] = path.split('?');
  const clean = pathnameOf(pathname);

  if (clean === 'dashboard' || clean === 'notes') {
    return search ? `${CHRONOLOGIO_HOME}?${search}` : CHRONOLOGIO_HOME;
  }

  if (clean !== 'today') {
    return path;
  }

  const params = new URLSearchParams(search);
  if (!params.has('focus') && !params.has('view')) {
    params.set('focus', 'today');
  }
  const next = params.toString();
  return next ? `${CHRONOLOGIO_HOME}?${next}` : CHRONOLOGIO_TODAY;
};

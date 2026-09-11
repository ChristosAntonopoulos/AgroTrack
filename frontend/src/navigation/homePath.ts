export const CHRONOLOGIO_HOME = '/chronologio';
export const CHRONOLOGIO_TODAY = '/chronologio?focus=today';

/** Legacy morning-view URLs become Chronologio with Today in focus. */
export const migrateLegacyHomePath = (path?: string | null): string => {
  if (!path) return CHRONOLOGIO_HOME;
  const [pathname, search = ''] = path.split('?');
  if (pathname !== '/today' && pathname !== 'today') {
    return path;
  }

  const params = new URLSearchParams(search);
  if (!params.has('focus') && !params.has('view')) {
    params.set('focus', 'today');
  }
  const next = params.toString();
  return next ? `${CHRONOLOGIO_HOME}?${next}` : CHRONOLOGIO_TODAY;
};

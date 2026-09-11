import { CHRONOLOGIO_HOME, CHRONOLOGIO_TODAY, migrateLegacyHomePath } from './homePath';

describe('migrateLegacyHomePath', () => {
  it('sends /today to Chronologio with today focus', () => {
    expect(migrateLegacyHomePath('/today')).toBe(CHRONOLOGIO_TODAY);
    expect(migrateLegacyHomePath('today')).toBe(CHRONOLOGIO_TODAY);
  });

  it('preserves extra query params', () => {
    expect(migrateLegacyHomePath('/today?field=abc')).toBe('/chronologio?field=abc&focus=today');
  });

  it('leaves Chronologio and other paths alone', () => {
    expect(migrateLegacyHomePath('/chronologio?view=days')).toBe('/chronologio?view=days');
    expect(migrateLegacyHomePath('/tasks')).toBe('/tasks');
    expect(migrateLegacyHomePath(null)).toBe(CHRONOLOGIO_HOME);
  });
});

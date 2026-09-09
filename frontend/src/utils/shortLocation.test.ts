import { getFieldShortLocation, getShortLocation } from './shortLocation';

describe('getShortLocation', () => {
  it('takes text before the first comma', () => {
    expect(getShortLocation('ΦΙΛΙΑΤΡΩΝ, 11206, Μεσσηνίας')).toBe('ΦΙΛΙΑΤΡΩΝ');
    expect(getShortLocation('Κυπαρισσία, Μεσσηνία')).toBe('Κυπαρισσία');
  });

  it('returns the trimmed string when there is no comma', () => {
    expect(getShortLocation('Άγνωστη περιοχή')).toBe('Άγνωστη περιοχή');
    expect(getShortLocation('  ΦΙΛΙΑΤΡΩΝ  ')).toBe('ΦΙΛΙΑΤΡΩΝ');
  });

  it('returns empty for blank input', () => {
    expect(getShortLocation('')).toBe('');
    expect(getShortLocation('   ')).toBe('');
    expect(getShortLocation(null)).toBe('');
    expect(getShortLocation(undefined)).toBe('');
  });
});

describe('getFieldShortLocation', () => {
  it('prefers locationText and does not alter the stored value', () => {
    const field = { locationText: 'ΦΙΛΙΑΤΡΩΝ, 11206, Μεσσηνίας' };
    expect(getFieldShortLocation(field)).toBe('ΦΙΛΙΑΤΡΩΝ');
    expect(field.locationText).toBe('ΦΙΛΙΑΤΡΩΝ, 11206, Μεσσηνίας');
  });

  it('falls back to cadastre location', () => {
    expect(
      getFieldShortLocation({
        greekCadastre: { locationFromCadastre: 'Κυπαρισσία, Μεσσηνία' },
      })
    ).toBe('Κυπαρισσία');
  });
});

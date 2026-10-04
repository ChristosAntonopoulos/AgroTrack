import { friendlyFieldLabel } from './fieldLabels';

describe('friendlyFieldLabel', () => {
  it('strips Olive Field prefixes', () => {
    expect(friendlyFieldLabel('Olive Field - ΦΙΛΙΑΤΡΩΝ - 088')).toBe('ΦΙΛΙΑΤΡΩΝ · 088');
  });

  it('strips trailing olive variety from demo grove names', () => {
    expect(friendlyFieldLabel('Φιλιατρών 088 — Μεγαρίτικη')).toBe('Φιλιατρών 088');
    expect(friendlyFieldLabel('Φιλιατρών 089 — Κορωνέικη')).toBe('Φιλιατρών 089');
    expect(friendlyFieldLabel('Φιλιατρών 090 — Καλαμών')).toBe('Φιλιατρών 090');
  });

  it('keeps place names that are not varieties', () => {
    expect(friendlyFieldLabel('Κάτω Χώρα · 12')).toBe('Κάτω Χώρα · 12');
  });
});

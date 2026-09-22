import { amountPlaceholderForLocale, decimalSeparatorForLocale } from './decimalEntry';

describe('decimalEntry', () => {
  it('uses comma for el/it and period for en', () => {
    expect(decimalSeparatorForLocale('el')).toBe(',');
    expect(decimalSeparatorForLocale('it-IT')).toBe(',');
    expect(decimalSeparatorForLocale('en')).toBe('.');
    expect(amountPlaceholderForLocale('el')).toBe('0,00');
    expect(amountPlaceholderForLocale('en-GB')).toBe('0.00');
  });
});

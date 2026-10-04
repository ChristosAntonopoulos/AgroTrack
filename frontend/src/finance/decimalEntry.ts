/** Locale-aware decimal separator guidance for money amount inputs. */
export function decimalSeparatorForLocale(locale: string): ',' | '.' {
  const tag = locale.toLowerCase();
  if (tag.startsWith('en')) return '.';
  return ',';
}

export function amountPlaceholderForLocale(locale: string): string {
  return decimalSeparatorForLocale(locale) === ',' ? '0,00' : '0.00';
}

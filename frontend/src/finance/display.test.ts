import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  financialCategoryLabel,
  financialSourceLabel,
  financialStatusLabel,
  financialTypeHelp,
  financialTypeLabel,
  isProvisionalActiveYearResult,
  isRawFinancialValue,
  paymentMethodLabel,
  resultLabel,
  resultYearHelp,
  shortMonthLabel,
  unassignedFieldLabel,
} from './display';

describe('financial display labels', () => {
  const languages = ['el', 'en'];

  it('never returns raw keys for known categories', () => {
    [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].forEach((category) => {
      languages.forEach((language) => {
        const label = financialCategoryLabel(category, language);
        expect(label.length).toBeGreaterThan(0);
        expect(isRawFinancialValue(label)).toBe(false);
        expect(label).not.toBe(category);
      });
    });
  });

  it('never returns raw keys for type, status, source, or payment', () => {
    languages.forEach((language) => {
      (['income', 'expense'] as const).forEach((type) => {
        expect(isRawFinancialValue(financialTypeLabel(type, language))).toBe(false);
        expect(isRawFinancialValue(financialTypeHelp(type, language))).toBe(false);
      });
      (['draft', 'posted', 'void'] as const).forEach((status) => {
        expect(isRawFinancialValue(financialStatusLabel(status, language))).toBe(false);
      });
      (['manual', 'task', 'harvest', 'service'] as const).forEach((source) => {
        expect(isRawFinancialValue(financialSourceLabel(source, language))).toBe(false);
      });
      PAYMENT_METHODS.forEach((method) => {
        const label = paymentMethodLabel(method, language);
        expect(isRawFinancialValue(label)).toBe(false);
        expect(label).not.toBe(method);
      });
      expect(isRawFinancialValue(unassignedFieldLabel(language))).toBe(false);
      expect(isRawFinancialValue(resultYearHelp(language))).toBe(false);
    });
  });

  it('uses Greek as the default language', () => {
    expect(financialTypeLabel('income')).toBe('Έσοδο');
    expect(financialTypeLabel('expense')).toBe('Έξοδο');
    expect(financialCategoryLabel('labor')).toBe('Εργασία');
    expect(unassignedFieldLabel()).toBe('Γενική εκμετάλλευση');
  });

  it('labels yearly results in Greek without raw keys', () => {
    expect(resultLabel(null, false)).toBe('Δεν υπάρχουν ακόμη καταχωρήσεις');
    expect(resultLabel(12, true)).toBe('Κέρδος');
    expect(resultLabel(-4, true)).toBe('Ζημιά');
    expect(resultLabel(0, true)).toBe('Ισοσκελισμένο');
    expect(isRawFinancialValue(resultLabel(12, true))).toBe(false);
  });

  it('uses provisional language for the active year before harvest income', () => {
    expect(
      resultLabel(-1200, true, 'el', {
        isActiveYear: true,
        totalIncome: 0,
        hasHarvestIncome: false,
      })
    ).toBe('Προσωρινό υπόλοιπο');
    expect(
      isProvisionalActiveYearResult(-1200, true, {
        isActiveYear: true,
        totalIncome: 0,
        hasHarvestIncome: false,
      })
    ).toBe(true);
    expect(
      resultLabel(-1200, true, 'el', {
        isActiveYear: true,
        totalIncome: 500,
        hasHarvestIncome: true,
      })
    ).toBe('Ζημιά');
  });

  it('keeps Greek June and July month abbreviations distinct', () => {
    expect(shortMonthLabel(2026, 5, 'el')).toBe('Ιούν');
    expect(shortMonthLabel(2026, 6, 'el')).toBe('Ιούλ');
  });
});

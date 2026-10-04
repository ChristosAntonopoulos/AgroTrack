import {
  defaultQuantityUnit,
  parseDecimal,
  resolveQuantityCalculation,
  switchCalculationMode,
} from './quantityCalculator';

describe('quantityCalculator', () => {
  it('calculates amount from quantity × unit price', () => {
    const result = resolveQuantityCalculation({
      mode: 'quantity_times_unit_price',
      quantity: 15,
      quantityUnit: 'litre',
      unitPrice: 1.87,
    });
    expect(result.amount).toBe(28.05);
    expect(result.amountIsCalculated).toBe(true);
  });

  it('calculates olive-oil euro per litre from quantity and total', () => {
    const result = resolveQuantityCalculation({
      mode: 'quantity_and_total',
      quantity: 850,
      quantityUnit: 'litre',
      amount: 5270,
    });
    expect(result.amount).toBe(5270);
    expect(result.unitPrice).toBe(6.2);
    expect(result.unitPriceIsCalculated).toBe(true);
  });

  it('rejects zero quantity instead of dividing', () => {
    expect(() =>
      resolveQuantityCalculation({
        mode: 'quantity_and_total',
        quantity: 0,
        amount: 100,
      })
    ).toThrow();
  });

  it('accepts Greek decimal comma input', () => {
    expect(parseDecimal('6,20')).toBe(6.2);
    expect(parseDecimal('5.270,00')).toBe(5270);
    expect(parseDecimal('1.87')).toBe(1.87);
  });

  it('keeps a total-only amount without quantity', () => {
    const result = resolveQuantityCalculation({ mode: 'total_only', amount: 130 });
    expect(result.amount).toBe(130);
    expect(result.quantity).toBeNull();
  });

  it('preserves values when switching calculation modes', () => {
    const times = resolveQuantityCalculation({
      mode: 'quantity_times_unit_price',
      quantity: 15,
      quantityUnit: 'litre',
      unitPrice: 1.87,
    });
    const andTotal = switchCalculationMode(times, 'quantity_and_total');
    expect(andTotal.amount).toBe(28.05);
    expect(andTotal.unitPrice).toBe(1.87);
    expect(switchCalculationMode(andTotal, 'quantity_times_unit_price').amount).toBe(28.05);
  });

  it('defaults olive oil and fuel to litres and labour to workdays', () => {
    expect(defaultQuantityUnit('olive_oil_sale')).toBe('litre');
    expect(defaultQuantityUnit('fuel_and_energy')).toBe('litre');
    expect(defaultQuantityUnit('labor')).toBe('workday');
  });
});

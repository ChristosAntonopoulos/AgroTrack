import {
  convertOliveOilLitresToKg,
  estimateSacksKg,
  extractionYieldPercent,
  formatHarvestOilAmount,
  formatHarvestYieldPercent,
  oilKgFromAmount,
  OLIVE_OIL_KG_PER_LITRE,
  plausibleOilYield,
  settleOil,
} from './harvestCalculations';
import { isPositiveAmount, parseHarvestDecimal } from './harvestValidation';

describe('harvestCalculations', () => {
  it('converts litres to kg with the documented density', () => {
    expect(OLIVE_OIL_KG_PER_LITRE).toBe(0.916);
    expect(convertOliveOilLitresToKg(100)).toBeCloseTo(91.6, 5);
    expect(oilKgFromAmount(100, 'litres')).toBeCloseTo(91.6, 5);
    expect(oilKgFromAmount(100, 'kg')).toBe(100);
  });

  it('formats yield as a percentage, not mass', () => {
    expect(extractionYieldPercent(1000, 184)).toBeCloseTo(18.4, 5);
    expect(formatHarvestYieldPercent(18.4, 'el')).toMatch(/18[,.]4/);
    expect(formatHarvestYieldPercent(18, 'en')).toBe('18');
  });

  it('hides implausible oil yields', () => {
    expect(plausibleOilYield(18.4)).toBeCloseTo(18.4, 5);
    expect(plausibleOilYield(4)).toBeNull();
    expect(plausibleOilYield(650)).toBeNull();
    expect(plausibleOilYield(null)).toBeNull();
  });

  it('formats oil by unit', () => {
    expect(formatHarvestOilAmount(182, 'litres', 'en')).toMatch(/182/);
    expect(formatHarvestOilAmount(167.2, 'kg', 'en')).toBe('167.2');
  });

  it('splits one oil total into storage and the mill share', () => {
    const whole = settleOil({
      total: 100,
      unit: 'litres',
      millKept: 0,
      millMode: 'amount',
      tin16Count: 0,
      tin17Count: 0,
      splitTins: false,
    });
    expect(whole.farmerAmount).toBe(100);
    expect(whole.millAmount).toBe(0);
    expect(whole.parts.map((part) => part.key)).toEqual(['stored', 'mill']);
    expect(whole.parts[0].percent).toBe(100);
    expect(whole.parts[1].percent).toBe(0);

    const mixed = settleOil({
      total: 100,
      unit: 'litres',
      millKept: 10,
      millMode: 'percent',
      tin16Count: 2,
      tin17Count: 1,
      splitTins: true,
    });
    expect(mixed.millAmount).toBe(10);
    expect(mixed.tin16Amount).toBe(32);
    expect(mixed.tin17Amount).toBe(17);
    expect(mixed.bulkAmount).toBe(41);
    expect(mixed.overAmount).toBe(0);
    expect(mixed.parts.reduce((sum, part) => sum + part.percent, 0)).toBeCloseTo(100, 5);
  });

  it('flags tins or a mill share that exceed the oil', () => {
    const overTins = settleOil({
      total: 100,
      unit: 'litres',
      millKept: 0,
      millMode: 'amount',
      tin16Count: 7,
      tin17Count: 0,
      splitTins: true,
    });
    expect(overTins.overAmount).toBe(12);
    expect(overTins.bulkAmount).toBe(0);

    const overMill = settleOil({
      total: 80,
      unit: 'kg',
      millKept: 90,
      millMode: 'amount',
      tin16Count: 0,
      tin17Count: 0,
      splitTins: false,
    });
    expect(overMill.millOver).toBe(true);

    const inKg = settleOil({
      total: 100,
      unit: 'kg',
      millKept: 0,
      millMode: 'amount',
      tin16Count: 1,
      tin17Count: 0,
      splitTins: true,
    });
    expect(inKg.tin16Amount).toBeCloseTo(16 * OLIVE_OIL_KG_PER_LITRE, 5);
  });

  it('estimates sacks kilograms', () => {
    expect(estimateSacksKg(10, 45)).toBe(450);
    expect(estimateSacksKg(0, 45)).toBe(0);
  });
});

describe('harvestValidation', () => {
  it('parses Greek and English decimals', () => {
    expect(parseHarvestDecimal('18,4')).toBe(18.4);
    expect(parseHarvestDecimal('18.4')).toBe(18.4);
    expect(parseHarvestDecimal('')).toBeNull();
  });

  it('detects positive amounts', () => {
    expect(isPositiveAmount(1)).toBe(true);
    expect(isPositiveAmount(0)).toBe(false);
    expect(isPositiveAmount(null)).toBe(false);
  });
});

import { formatOilPack } from './formatOilPack';
import { clampPackInput, emptyOilPackInput, packFromSplit, packLitresOf } from './packInput';

describe('myOil pack helpers', () => {
  it('formats tins and bulk', () => {
    const label = formatOilPack(
      { tin16: 2, tin17: 1, bulkLitres: 4, litres: 53 },
      {
        tin: (count, size) => `${count}×${size}`,
        bulk: (amount) => `${amount}B`,
        litres: (amount) => `${amount}L`,
      }
    );
    expect(label).toBe('2×16 · 1×17 · 4B');
  });

  it('computes pack litres', () => {
    expect(packLitresOf({ tin16: 1, tin17: 1, bulkLitres: 2 })).toBe(35);
  });

  it('clamps to available stock', () => {
    const next = clampPackInput(
      { tin16: 9, tin17: 0, bulkLitres: 100 },
      { tin16: 3, tin17: 0, bulkLitres: 12, litres: 60 }
    );
    expect(next).toEqual({ tin16: 3, tin17: 0, bulkLitres: 12 });
  });

  it('starts empty', () => {
    expect(emptyOilPackInput()).toEqual({ tin16: 0, tin17: 0, bulkLitres: 0 });
  });

  it('keeps a whole amount as bulk until it is split', () => {
    expect(packFromSplit(100, 'all', { 16: 2 })).toEqual({
      tin16: 0,
      tin17: 0,
      bulkLitres: 100,
    });
  });

  it('stores 16 and 17 as tins and leaves the rest loose', () => {
    expect(packFromSplit(100, 'tins', { 5: 2, 16: 1, 17: 2 })).toEqual({
      tin16: 1,
      tin17: 2,
      bulkLitres: 50,
    });
  });
});

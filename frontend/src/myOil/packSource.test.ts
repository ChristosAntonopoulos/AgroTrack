import { defaultPackSource, fifoBulkLots } from './packSource';
import type { OilLot } from '../services/oilStockService';

const lot = (id: string, pressedOn: string, bulkLitres: number, createdAt = pressedOn) =>
  ({ id, pressedOn, createdAt, packing: { tin16: 0, tin17: 0, bulkLitres, litres: bulkLitres } }) as unknown as OilLot;

describe('QA_037 deterministic packaging source', () => {
  it('picks the oldest lot with loose oil, regardless of input order', () => {
    const lots = [lot('b', '2026-11-12', 50), lot('a', '2026-11-10', 20), lot('c', '2026-11-01', 0)];
    expect(fifoBulkLots(lots).map((l) => l.id)).toEqual(['a', 'b']);
    expect(defaultPackSource([...lots].reverse())?.id).toBe('a');
  });

  it('breaks pressing-date ties by creation time then id', () => {
    const lots = [
      lot('z', '2026-11-10', 10, '2026-11-10T09:00:00Z'),
      lot('y', '2026-11-10', 10, '2026-11-10T08:00:00Z'),
      lot('x', '2026-11-10', 10, '2026-11-10T08:00:00Z'),
    ];
    expect(fifoBulkLots(lots).map((l) => l.id)).toEqual(['x', 'y', 'z']);
  });

  it('returns null when there is no loose oil', () => {
    expect(defaultPackSource([lot('a', '2026-11-10', 0)])).toBeNull();
  });
});

import {
  allocateSoldPack,
  applyOilSale,
  farmerOilLitres,
  fillOilPack,
  oilEntryPack,
  oilSaleFieldId,
  packLitres,
  saleableOilLots,
  setPackAmount,
} from './oilSaleLots';
import { emptyCampaign } from './types';

const oil = (patch: Partial<{
  id: string;
  amount: number;
  unit: 'litres' | 'kg';
  date: string;
  millKept?: number;
  tin16Count?: number;
  tin17Count?: number;
  fieldIds?: string[];
  harvestRecordId?: string;
  soldLitres?: number;
  soldTin16?: number;
  soldTin17?: number;
  soldBulkLitres?: number;
}> & { id: string; amount: number; unit: 'litres' | 'kg' }) => ({
  date: '2026-09-22',
  millWeightIds: [] as string[],
  fieldIds: ['f1'],
  createdAt: '2026-09-22T12:00:00',
  ...patch,
});

describe('farmerOilLitres', () => {
  it('keeps litres the mill did not take', () => {
    expect(farmerOilLitres(oil({ id: 'a', amount: 100, unit: 'litres', millKept: 10 }))).toBe(90);
  });

  it('converts kilograms to litres', () => {
    expect(farmerOilLitres(oil({ id: 'b', amount: 91.6, unit: 'kg' }))).toBe(100);
  });

  it('returns zero when the mill kept the whole lot', () => {
    expect(farmerOilLitres(oil({ id: 'c', amount: 40, unit: 'litres', millKept: 40 }))).toBe(0);
  });
});

describe('oilEntryPack', () => {
  it('treats oil with no tins as bulk', () => {
    expect(oilEntryPack(oil({ id: 'a', amount: 100, unit: 'litres', millKept: 10 }))).toEqual({
      tin16: 0,
      tin17: 0,
      bulkLitres: 90,
    });
  });

  it('keeps tin counts and the litres left beside them', () => {
    expect(
      oilEntryPack(
        oil({ id: 'b', amount: 100, unit: 'litres', tin16Count: 2, tin17Count: 1 })
      )
    ).toEqual({ tin16: 2, tin17: 1, bulkLitres: 51 });
  });
});

describe('setPackAmount', () => {
  const stock = { tin16: 3, tin17: 1, bulkLitres: 40 };

  it('mixes tins and bulk without passing the oil in the lots', () => {
    const withTins = setPackAmount({ tin16: 0, tin17: 0, bulkLitres: 0 }, stock, 100, 'tin16', 2);
    const mixed = setPackAmount(withTins, stock, 100, 'bulkLitres', 40);
    expect(mixed).toEqual({ tin16: 2, tin17: 0, bulkLitres: 40 });
    expect(packLitres(mixed)).toBe(72);
  });

  it('stops a container when the chosen oil runs out', () => {
    const full = setPackAmount({ tin16: 3, tin17: 1, bulkLitres: 0 }, stock, 65, 'bulkLitres', 40);
    expect(full.bulkLitres).toBe(0);
    expect(packLitres(full)).toBe(65);
  });
});

describe('fillOilPack', () => {
  it('takes every tin and the bulk that still fits', () => {
    expect(fillOilPack({ tin16: 2, tin17: 0, bulkLitres: 20 }, 40)).toEqual({
      tin16: 2,
      tin17: 0,
      bulkLitres: 8,
    });
  });
});

describe('saleableOilLots', () => {
  it('lists only oil the farmer still has, newest first', () => {
    const campaign = emptyCampaign(2026);
    campaign.oils = [
      oil({ id: 'old', amount: 50, unit: 'litres', date: '2026-09-20', harvestRecordId: 'h1' }),
      oil({ id: 'gone', amount: 20, unit: 'litres', date: '2026-09-22', millKept: 20 }),
      oil({ id: 'new', amount: 80, unit: 'litres', date: '2026-09-22', fieldIds: ['f1', 'f2'] }),
    ];
    expect(saleableOilLots(campaign).map((lot) => lot.id)).toEqual(['new', 'old']);
    expect(saleableOilLots(campaign)[0]).toMatchObject({
      litres: 80,
      harvestRecordId: undefined,
      harvestRecordIds: [],
      fieldIds: ['f1', 'f2'],
      sold: false,
    });
  });

  it('subtracts sold litres and keeps a fully sold lot visible but marked sold', () => {
    const campaign = emptyCampaign(2026);
    campaign.oils = [
      oil({
        id: 'partial',
        amount: 100,
        unit: 'litres',
        tin16Count: 2,
        soldLitres: 40,
        soldTin16: 1,
        soldBulkLitres: 24,
      }),
      oil({
        id: 'all',
        amount: 50,
        unit: 'litres',
        date: '2026-09-20',
        soldLitres: 50,
        soldBulkLitres: 50,
      }),
    ];
    const lots = saleableOilLots(campaign);
    expect(lots.map((lot) => lot.id)).toEqual(['partial', 'all']);
    expect(lots[0]).toMatchObject({
      litres: 60,
      soldLitres: 40,
      sold: false,
      pack: { tin16: 1, tin17: 0, bulkLitres: 44 },
    });
    expect(lots[1]).toMatchObject({ litres: 0, sold: true, pack: { tin16: 0, tin17: 0, bulkLitres: 0 } });
  });
});

describe('oilSaleFieldId', () => {
  it('uses the single grove, or empty when several stay together', () => {
    expect(oilSaleFieldId([{ fieldIds: ['f1'] }])).toBe('f1');
    expect(oilSaleFieldId([{ fieldIds: ['f1', 'f2'] }])).toBe('');
    expect(oilSaleFieldId([{ fieldIds: ['f1'] }, { fieldIds: ['f2'] }])).toBe('');
  });
});

describe('allocateSoldPack + applyOilSale', () => {
  it('links provenance without reducing harvest remaining litres', () => {
    const campaign = emptyCampaign(2026);
    campaign.oils = [
      oil({ id: 'a', amount: 100, unit: 'litres', tin16Count: 2, tin17Count: 1 }),
    ];
    const [lot] = saleableOilLots(campaign);
    const beforeLitres = lot.litres;
    const sold = { tin16: 1, tin17: 0, bulkLitres: 20 };
    const allocations = allocateSoldPack([lot], sold);
    expect(allocations).toEqual([{ id: 'a', pack: sold }]);
    const next = applyOilSale(campaign, allocations);
    expect(saleableOilLots(next)[0].litres).toBe(beforeLitres);
    expect(next.oils[0].saleLinks?.[0]).toMatchObject(sold);
  });

  it('does not treat harvest soldLitres as a second inventory', () => {
    const campaign = emptyCampaign(2026);
    campaign.oils = [oil({ id: 'a', amount: 40, unit: 'litres' })];
    const [lot] = saleableOilLots(campaign);
    const next = applyOilSale(campaign, allocateSoldPack([lot], { tin16: 0, tin17: 0, bulkLitres: 40 }));
    expect(saleableOilLots(next)[0]).toMatchObject({ litres: 40, sold: false });
    expect(next.oils[0].saleLinks?.[0].litres).toBe(40);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { OilLot, OilPack } from '../services/oilStockService';
import {
  commitmentFieldLabel,
  drainCovers,
  groupLotsByField,
  planFieldAdd,
  planFieldDrain,
  planFieldFill,
  planFieldRepack,
  poolLabel,
} from './fieldPools';

const pack = (tin16: number, tin17: number, bulkLitres: number): OilPack => ({
  tin16,
  tin17,
  bulkLitres,
  litres: tin16 * 16 + tin17 * 17 + bulkLitres,
});

const lot = (
  patch: Partial<OilLot> & Pick<OilLot, 'id' | 'fieldIds' | 'pressedOn'>
): OilLot => ({
  batchId: patch.id,
  resultYear: 2025,
  harvestRecordIds: [],
  totalAmount: 0,
  unit: 'litres',
  millKept: 0,
  farmerLitres: 0,
  packing: pack(0, 0, 0),
  reserved: pack(0, 0, 0),
  available: pack(0, 0, 0),
  createdAt: patch.pressedOn,
  updatedAt: patch.pressedOn,
  ...patch,
});

describe('groupLotsByField', () => {
  it('adds every pressing of a field into one pile and keeps a shared pressing whole', () => {
    const pools = groupLotsByField([
      lot({
        id: 'n1',
        fieldIds: ['north'],
        pressedOn: '2025-11-02T12:00:00Z',
        packing: pack(1, 0, 10),
        available: pack(1, 0, 10),
        farmerLitres: 26,
      }),
      lot({
        id: 'n2',
        fieldIds: ['north'],
        pressedOn: '2025-11-20T12:00:00Z',
        packing: pack(0, 1, 0),
        available: pack(0, 1, 0),
        farmerLitres: 17,
      }),
      lot({
        id: 'shared',
        fieldIds: ['south', 'north'],
        pressedOn: '2025-11-12T12:00:00Z',
        packing: pack(0, 0, 40),
        available: pack(0, 0, 40),
        farmerLitres: 40,
      }),
    ]);

    assert.deepEqual(
      pools.map((pool) => pool.fieldIds),
      [['north'], ['south', 'north']]
    );
    const north = pools[0];
    assert.deepEqual(north.lots.map((item) => item.id), ['n1', 'n2']);
    assert.equal(north.packing.tin16, 1);
    assert.equal(north.packing.tin17, 1);
    assert.equal(north.packing.bulkLitres, 10);
    assert.equal(north.packing.litres, 43);
    assert.equal(north.farmerLitres, 43);
    assert.equal(pools[1].packing.bulkLitres, 40);
    assert.equal(
      pools.reduce((sum, pool) => sum + pool.packing.litres, 0),
      83
    );
  });

  it('treats the same fields in a different order as one pile', () => {
    const pools = groupLotsByField([
      lot({ id: 'a', fieldIds: ['b', 'a'], pressedOn: '2025-11-01T12:00:00Z', packing: pack(1, 0, 0), available: pack(1, 0, 0) }),
      lot({ id: 'b', fieldIds: ['a', 'b'], pressedOn: '2025-11-02T12:00:00Z', packing: pack(0, 1, 0), available: pack(0, 1, 0) }),
    ]);
    assert.equal(pools.length, 1);
    assert.equal(pools[0].packing.tin16, 1);
    assert.equal(pools[0].packing.tin17, 1);
    assert.equal(poolLabel(pools[0], { a: 'Alpha', b: 'Beta' }, 'No field'), 'Beta · Alpha');
  });
});

describe('planFieldDrain', () => {
  const lots = [
    lot({
      id: 'old',
      fieldIds: ['north'],
      pressedOn: '2025-11-01T12:00:00Z',
      available: pack(1, 0, 3),
    }),
    lot({
      id: 'new',
      fieldIds: ['north'],
      pressedOn: '2025-11-20T12:00:00Z',
      available: pack(2, 0, 4),
    }),
  ];

  it('uses the oldest free oil first and does not touch held oil', () => {
    assert.deepEqual(planFieldDrain(lots, { tin16: 2, tin17: 0, bulkLitres: 5 }), [
      { oilLotId: 'old', pack: { tin16: 1, tin17: 0, bulkLitres: 3 } },
      { oilLotId: 'new', pack: { tin16: 1, tin17: 0, bulkLitres: 2 } },
    ]);
    assert.equal(drainCovers(lots, { tin16: 2, tin17: 0, bulkLitres: 5 }), true);
    assert.equal(drainCovers(lots, { tin16: 4, tin17: 0, bulkLitres: 0 }), false);
  });
});

describe('planFieldRepack', () => {
  it('fills whole tins from free bulk across the field, oldest first', () => {
    const slices = planFieldRepack(
      [
        lot({
          id: 'short',
          fieldIds: ['north'],
          pressedOn: '2025-11-01T12:00:00Z',
          available: pack(0, 0, 10),
          packing: pack(0, 0, 10),
        }),
        lot({
          id: 'rest',
          fieldIds: ['north'],
          pressedOn: '2025-11-08T12:00:00Z',
          available: pack(0, 0, 50),
          packing: pack(0, 0, 50),
        }),
      ],
      2,
      1
    );
    assert.deepEqual(slices, [{ oilLotId: 'rest', addTin16: 2, addTin17: 1 }]);
  });
});

describe('planFieldFill', () => {
  it('gathers split bulk onto one pressing when a tin will not fit otherwise', () => {
    const plan = planFieldFill(
      [
        lot({
          id: 'a',
          fieldIds: ['north'],
          pressedOn: '2025-11-01T12:00:00Z',
          packing: pack(0, 0, 30),
          available: pack(0, 0, 30),
        }),
        lot({
          id: 'b',
          fieldIds: ['north'],
          pressedOn: '2025-11-02T12:00:00Z',
          packing: pack(1, 0, 10),
          available: pack(1, 0, 10),
        }),
      ],
      2,
      0
    );
    assert.deepEqual(plan.moves, [
      { oilLotId: 'b', packing: { tin16: 1, tin17: 0, bulkLitres: 0 } },
      { oilLotId: 'a', packing: { tin16: 0, tin17: 0, bulkLitres: 40 } },
    ]);
    assert.deepEqual(plan.repacks, [{ oilLotId: 'a', addTin16: 2, addTin17: 0 }]);
  });
});

describe('planFieldAdd', () => {
  it('puts extra oil on the newest pressing of the field', () => {
    assert.deepEqual(
      planFieldAdd(
        [
          lot({ id: 'old', fieldIds: ['north'], pressedOn: '2025-11-01T12:00:00Z' }),
          lot({ id: 'new', fieldIds: ['north'], pressedOn: '2025-11-20T12:00:00Z' }),
        ],
        { tin16: 1, tin17: 0, bulkLitres: 0 }
      ),
      [{ oilLotId: 'new', pack: { tin16: 1, tin17: 0, bulkLitres: 0 } }]
    );
  });
});

describe('commitmentFieldLabel', () => {
  it('names the fields and skips the pressing', () => {
    const lots = [
      lot({ id: 'n1', fieldIds: ['north'], pressedOn: '2025-11-01T12:00:00Z' }),
      lot({ id: 'n2', fieldIds: ['north'], pressedOn: '2025-11-02T12:00:00Z' }),
    ];
    assert.equal(
      commitmentFieldLabel(
        [{ oilLotId: 'n1' }, { oilLotId: 'n2' }],
        lots,
        { north: 'Kambos' },
        'No field'
      ),
      'Kambos'
    );
  });
});

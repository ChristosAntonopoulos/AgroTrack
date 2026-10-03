import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { OilCommitment, OilPack } from '../services/oilStockService';
import { cellarFlow, cellarSlices, packSegments } from './stockPicture';

const pack = (tin16: number, tin17: number, bulkLitres: number): OilPack => ({
  tin16,
  tin17,
  bulkLitres,
  litres: tin16 * 16 + tin17 * 17 + bulkLitres,
});

const commitment = (patch: Partial<OilCommitment> & Pick<OilCommitment, 'isSale' | 'remaining'>): OilCommitment =>
  ({
    id: 'c',
    counterpartyName: 'A',
    requested: patch.remaining,
    delivered: pack(0, 0, 0),
    currency: 'EUR',
    allocations: [],
    cancelled: false,
    derivedStatus: 'reserved',
    createdAt: '2026-11-01',
    updatedAt: '2026-11-01',
    ...patch,
  }) as OilCommitment;

describe('cellarSlices', () => {
  it('splits oil still in the cellar into free, held, and waiting for pickup', () => {
    const picture = cellarSlices({
      onHand: pack(0, 0, 100),
      available: pack(0, 0, 70),
      held: pack(0, 0, 30),
      openCommitments: [
        commitment({ isSale: false, remaining: pack(0, 0, 20) }),
        commitment({ isSale: true, remaining: pack(0, 0, 10), derivedStatus: 'pending_delivery' }),
        commitment({ isSale: true, remaining: pack(0, 0, 50), derivedStatus: 'delivered' }),
      ],
    });
    assert.equal(picture.total, 100);
    assert.deepEqual(
      picture.slices.map((slice) => slice.litres),
      [70, 20, 10]
    );
    assert.equal(
      picture.slices.reduce((sum, slice) => sum + slice.pct, 0),
      100
    );
  });

  it('keeps a held total when commitments are missing', () => {
    const picture = cellarSlices({
      onHand: pack(0, 0, 10),
      available: pack(0, 0, 6),
      held: pack(0, 0, 4),
      openCommitments: [],
    });
    assert.equal(picture.slices.find((slice) => slice.key === 'held')?.litres, 4);
    assert.equal(picture.slices.find((slice) => slice.key === 'awaiting')?.litres, 0);
  });
});

describe('cellarFlow', () => {
  it('counts sold and given oil outside the stock ring, and paid sales as income', () => {
    const flow = cellarFlow([
      commitment({
        isSale: true,
        remaining: pack(0, 0, 0),
        requested: pack(0, 0, 680),
        delivered: pack(0, 0, 680),
        derivedStatus: 'delivered',
        amount: 4250,
      }),
      commitment({
        isSale: false,
        remaining: pack(0, 0, 0),
        requested: pack(0, 0, 20),
        delivered: pack(0, 0, 20),
        derivedStatus: 'delivered',
        counterpartyName: 'Χρήστος',
      }),
      commitment({ isSale: true, remaining: pack(0, 0, 10), derivedStatus: 'pending_delivery' }),
    ]);
    assert.equal(flow.soldLitres, 690);
    assert.equal(flow.givenLitres, 20);
    assert.equal(flow.revenue, 4250);
  });
});

describe('packSegments', () => {
  it('turns tins into litres and percentages of the shelf', () => {
    const segments = packSegments(pack(3, 9, 959.5));
    const bulk = segments.find((segment) => segment.key === 'bulk');
    const tin16 = segments.find((segment) => segment.key === 'tin16');
    const tin17 = segments.find((segment) => segment.key === 'tin17');
    assert.equal(tin16?.litres, 48);
    assert.equal(tin16?.count, 3);
    assert.equal(tin17?.litres, 153);
    assert.equal(bulk?.litres, 959.5);
    assert.equal(
      segments.reduce((sum, segment) => sum + segment.pct, 0),
      100
    );
  });
});

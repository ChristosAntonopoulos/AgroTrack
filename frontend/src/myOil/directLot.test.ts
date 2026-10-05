import { directStorageLot } from './directLot';

describe('directStorageLot', () => {
  it('records litres in storage with no grove, mill, or harvest', () => {
    const lot = directStorageLot(
      { tin16: 1, tin17: 2, bulkLitres: 3.2 },
      '  from the uncle  ',
      new Date('2026-10-05T12:00:00.000Z'),
      'abc123'
    );
    expect(lot).toEqual({
      batchId: 'storage-20261005-abc123',
      pressedOn: '2026-10-05T12:00:00.000Z',
      totalAmount: 53.2,
      unit: 'litres',
      millKept: 0,
      packing: { tin16: 1, tin17: 2, bulkLitres: 3.2 },
      notes: 'from the uncle',
    });
    expect(lot.fieldIds).toBeUndefined();
    expect(lot.harvestRecordIds).toBeUndefined();
    expect(lot.sourcePressingId).toBeUndefined();
  });

  it('omits a blank note', () => {
    const lot = directStorageLot(
      { tin16: 0, tin17: 0, bulkLitres: 10 },
      '   ',
      new Date('2026-01-02T00:00:00.000Z'),
      'x'
    );
    expect(lot.notes).toBeUndefined();
    expect(lot.totalAmount).toBe(10);
  });
});

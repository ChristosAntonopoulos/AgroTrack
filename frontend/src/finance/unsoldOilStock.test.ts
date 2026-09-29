import { emptyCampaign, type HarvestOilEntry } from '../harvestCampaign/types';
import {
  filterUnsoldOilLots,
  groupUnsoldOil,
  sumUnsoldOil,
  unsoldOilFromCampaigns,
} from './unsoldOilStock';

const oil = (
  patch: Partial<HarvestOilEntry> & Pick<HarvestOilEntry, 'id' | 'amount' | 'date'>
): HarvestOilEntry => ({
  unit: 'litres',
  millWeightIds: [],
  fieldIds: ['north'],
  createdAt: `${patch.date}T12:00:00`,
  ...patch,
});

describe('unsoldOilFromCampaigns', () => {
  it('keeps unsold tins and bulk, and drops a lot that is fully sold', () => {
    const current = {
      ...emptyCampaign(2025),
      oils: [
        oil({
          id: 'nov',
          date: '2025-11-12',
          amount: 100,
          fieldIds: ['north'],
          tin16Count: 4,
          soldTin16: 1,
          soldLitres: 16,
        }),
        oil({
          id: 'sold-out',
          date: '2025-11-20',
          amount: 32,
          tin16Count: 2,
          soldTin16: 2,
          soldLitres: 32,
        }),
      ],
    };
    const earlier = {
      ...emptyCampaign(2024),
      oils: [
        oil({
          id: 'dec',
          date: '2024-12-03',
          amount: 91,
          fieldIds: ['south'],
          tin16Count: 2,
          tin17Count: 1,
          soldLitres: 16,
          soldTin16: 1,
        }),
      ],
    };

    const lots = unsoldOilFromCampaigns([current, earlier]);
    expect(lots.map((lot) => lot.id)).toEqual(['2025:nov', '2024:dec']);
    expect(lots[0]).toMatchObject({
      harvestYear: 2025,
      fieldIds: ['north'],
      litres: 84,
      tin16: 3,
      tin17: 0,
      bulkLitres: 36,
    });
    expect(lots[1]).toMatchObject({
      harvestYear: 2024,
      tin16: 1,
      tin17: 1,
      bulkLitres: 42,
    });

    const totals = sumUnsoldOil(lots);
    expect(totals.tin16).toBe(4);
    expect(totals.tin17).toBe(1);
    expect(totals.litres).toBe(lots[0].litres + lots[1].litres);

    const grouped = groupUnsoldOil(lots, 2025);
    expect(grouped.thisYear.map((lot) => lot.id)).toEqual(['2025:nov']);
    expect(grouped.otherYears).toEqual([{ harvestYear: 2024, lots: [lots[1]] }]);

    expect(filterUnsoldOilLots(lots, 'south').map((lot) => lot.id)).toEqual(['2024:dec']);
    expect(filterUnsoldOilLots(lots, null)).toHaveLength(2);
  });

  it('treats oil stored without tins as bulk litres', () => {
    const campaign = {
      ...emptyCampaign(2025),
      oils: [oil({ id: 'bulk', date: '2025-10-02', amount: 40, millKept: 5 })],
    };
    expect(unsoldOilFromCampaigns([campaign])[0]).toMatchObject({
      litres: 35,
      tin16: 0,
      tin17: 0,
      bulkLitres: 35,
    });
  });
});

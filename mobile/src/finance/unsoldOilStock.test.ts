import { emptyCampaign, type HarvestOilEntry } from '../harvestCampaign/types';
import {
  filterUnsoldOilLots,
  groupUnsoldOil,
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
  it('labels leftover oil from an earlier harvest year and keeps a shared lot whole', () => {
    const campaign = {
      ...emptyCampaign(2025),
      oils: [
        oil({
          id: 'shared',
          date: '2025-11-12',
          amount: 50,
          fieldIds: ['north', 'south'],
          tin17Count: 2,
        }),
        oil({
          id: 'old',
          date: '2024-12-03',
          amount: 20,
          fieldIds: ['south'],
        }),
      ],
    };

    const lots = unsoldOilFromCampaigns([campaign]);
    const grouped = groupUnsoldOil(lots, 2025);
    expect(grouped.thisYear.map((lot) => lot.id)).toEqual(['2025:shared']);
    expect(grouped.thisYear[0]).toMatchObject({ tin17: 2, fieldIds: ['north', 'south'] });
    expect(grouped.otherYears[0].harvestYear).toBe(2024);

    expect(filterUnsoldOilLots(lots, 'north')).toHaveLength(1);
    expect(filterUnsoldOilLots(lots, 'south')).toHaveLength(2);
    expect(filterUnsoldOilLots(lots, '__unassigned__')).toHaveLength(0);
  });
});

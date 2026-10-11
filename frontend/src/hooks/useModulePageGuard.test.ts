import { moduleAllowed } from './useModulePageGuard';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
import type { FieldCapabilities } from '../services/fieldPeopleService';

const caps = (patch: Partial<FieldCapabilities>) => ({ canViewHarvest: false, canViewMoney: false, ...patch }) as FieldCapabilities;

describe('QA_008 My Oil guard', () => {
  it('is its own module, not "money"', () => {
    expect(moduleAllowed('myOil', caps({ canViewHarvest: true }))).toBe(true);
    expect(moduleAllowed('myOil', caps({ canViewMoney: true }))).toBe(true);
    expect(moduleAllowed('myOil', caps({}))).toBe(false);
    // money-only denial must not be conflated with My Oil
    expect(moduleAllowed('money', caps({ canViewHarvest: true }))).toBe(false);
  });
});

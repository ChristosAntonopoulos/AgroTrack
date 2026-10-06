import { buildCaptureMenu } from './menu';
import { buildQuickAddMoves, catalogSectionOrder, resolveQuickAddContext } from './quickAdd';
import { resolveCaptureFieldId } from './fieldContext';
import type { CapturePermissions } from './types';

const owner: CapturePermissions = {
  canRecordObservation: true,
  canRecordPhoto: true,
  canRecordWork: true,
  canRecordExpense: true,
  canRecordIncome: true,
  canRecordHarvest: true,
  canRecordMoney: true,
  canRecordVoice: true,
  canRecordDocument: true,
};

const groups = (live: boolean) =>
  buildCaptureMenu({
    permissions: owner,
    harvestKinds: ['sacks', 'mill', 'oil', 'people', 'expense', 'income', 'note'],
    isHarvestLive: live,
    canUseWarehouse: true,
    openSacks: live ? 3 : 0,
  });

describe('catalogSectionOrder', () => {
  it('leads with harvest in picking months and trails it the rest of the year', () => {
    expect(catalogSectionOrder(new Date(2026, 9, 5))).toEqual([
      'day',
      'grove',
      'money',
      'warehouse',
    ]);
    expect(catalogSectionOrder(new Date(2026, 5, 1))).toEqual([
      'grove',
      'money',
      'warehouse',
      'day',
    ]);
  });
});

describe('resolveQuickAddContext', () => {
  it('maps routes to contexts', () => {
    expect(resolveQuickAddContext({ pathname: '/harvest' })).toBe('harvest');
    expect(resolveQuickAddContext({ pathname: '/my-oil' })).toBe('warehouse');
    expect(resolveQuickAddContext({ pathname: '/money' })).toBe('money');
    expect(resolveQuickAddContext({ pathname: '/fields/abc' })).toBe('grove');
    expect(resolveQuickAddContext({ pathname: '/tasks' })).toBe('tasks');
    expect(resolveQuickAddContext({ pathname: '/photos' })).toBe('photos');
    expect(resolveQuickAddContext({ pathname: '/chronologio' })).toBe('home');
    expect(resolveQuickAddContext({ pathname: '/chronologio', isHarvestLive: true })).toBe('home');
  });

  it('uses the current route before a stale sourcePage', () => {
    expect(
      resolveQuickAddContext({ pathname: '/fields/abc', sourcePage: 'warehouse' })
    ).toBe('grove');
  });
});

describe('buildQuickAddMoves', () => {
  it('shows the universal four on home when harvest is closed', () => {
    const moves = buildQuickAddMoves({
      pathname: '/chronologio',
      isHarvestLive: false,
      groups: groups(false),
    });
    expect(moves.map((m) => m.id)).toEqual(['work', 'observation', 'expense', 'harvest']);
  });

  it('prioritises harvest actions inside harvest even before campaign hydrates', () => {
    const moves = buildQuickAddMoves({
      pathname: '/harvest',
      isHarvestLive: false,
      groups: groups(false),
      recentIds: ['sell', 'income'],
    });
    expect(moves.map((m) => m.id)).toEqual(['sacks', 'mill', 'oil', 'expense']);
    expect(moves[0].surface).toBe('harvest');
    expect(moves[3]).toMatchObject({ surface: 'capture', type: 'expense' });
  });

  it('surfaces cellar actions on my-oil', () => {
    const moves = buildQuickAddMoves({
      pathname: '/my-oil',
      groups: groups(false),
    });
    expect(moves.map((m) => m.id)).toEqual(['add', 'sell', 'give', 'fill']);
  });

  it('never merges recents into grove tiles', () => {
    const moves = buildQuickAddMoves({
      pathname: '/fields',
      isHarvestLive: true,
      groups: groups(true),
      recentIds: ['sell', 'income', 'sacks'],
    });
    expect(moves.map((m) => m.id)).toEqual(['work', 'observation', 'expense', 'harvest']);
  });

  it('uses money presets including sell, not sacks', () => {
    const moves = buildQuickAddMoves({
      pathname: '/money',
      groups: groups(false),
      recentIds: ['sacks', 'add'],
    });
    expect(moves.map((m) => m.id)).toEqual(['income', 'expense', 'sell']);
    expect(moves.find((move) => move.id === 'expense')).toMatchObject({
      surface: 'capture',
      type: 'expense',
    });
    expect(moves.find((move) => move.id === 'income')).toMatchObject({
      surface: 'capture',
      type: 'income',
    });
  });

  it('uses tasks and photos presets', () => {
    expect(
      buildQuickAddMoves({ pathname: '/tasks', groups: groups(false) }).map((m) => m.id)
    ).toEqual(['work', 'observation', 'expense', 'harvest']);
    expect(
      buildQuickAddMoves({ pathname: '/photos', groups: groups(false) }).map((m) => m.id)
    ).toEqual(['observation', 'work', 'expense', 'harvest']);
  });

  it('does not default grove to the first available field', () => {
    expect(
      resolveCaptureFieldId({
        pathname: '/chronologio',
        availableIds: ['first', 'second'],
      })
    ).toBe('');
  });
});

describe('resolveCaptureFieldId', () => {
  it('prefers context, then route, then active, then remembered', () => {
    expect(
      resolveCaptureFieldId({
        contextFieldId: 'ctx',
        pathname: '/fields/route',
        activeFieldId: 'active',
        lastCaptureFieldId: 'last',
        lastMoneyFieldId: 'money',
        availableIds: ['ctx', 'route', 'active', 'last', 'money'],
      })
    ).toBe('ctx');
  });
});

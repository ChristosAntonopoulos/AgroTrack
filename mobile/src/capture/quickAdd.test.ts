import { buildCaptureMenu } from './menu';
import { buildQuickAddMoves, resolveQuickAddContext } from './quickAdd';
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

describe('resolveQuickAddContext', () => {
  it('maps routes to contexts', () => {
    expect(resolveQuickAddContext({ routeName: 'HarvestCampaign' })).toBe('harvest');
    expect(resolveQuickAddContext({ routeName: 'MyOil' })).toBe('warehouse');
    expect(resolveQuickAddContext({ routeName: 'Money' })).toBe('money');
    expect(resolveQuickAddContext({ routeName: 'FieldDetail' })).toBe('grove');
    expect(resolveQuickAddContext({ routeName: 'Tasks' })).toBe('tasks');
    expect(resolveQuickAddContext({ routeName: 'Photos' })).toBe('photos');
    expect(resolveQuickAddContext({ routeName: 'ChronologioTab' })).toBe('home');
    expect(
      resolveQuickAddContext({ routeName: 'ChronologioTab', isHarvestLive: true })
    ).toBe('home');
  });

  it('uses the current route before a stale sourcePage', () => {
    expect(
      resolveQuickAddContext({ routeName: 'FieldDetail', sourcePage: 'warehouse' })
    ).toBe('grove');
  });
});

describe('buildQuickAddMoves', () => {
  it('shows the universal four on home when harvest is closed', () => {
    const moves = buildQuickAddMoves({
      routeName: 'ChronologioTab',
      isHarvestLive: false,
      groups: groups(false),
    });
    expect(moves.map((m) => m.id)).toEqual([
      'scheduleWork',
      'recordWork',
      'observation',
      'expense',
    ]);
  });

  it('prioritises harvest actions inside harvest even before campaign hydrates', () => {
    const moves = buildQuickAddMoves({
      routeName: 'HarvestCampaign',
      isHarvestLive: false,
      groups: groups(false),
      recentIds: ['sell', 'income'],
    });
    expect(moves.map((m) => m.id)).toEqual(['sacks', 'mill', 'oil', 'expense']);
    expect(moves[3]).toMatchObject({ surface: 'capture', type: 'expense' });
  });

  it('never merges recents into grove tiles', () => {
    const moves = buildQuickAddMoves({
      routeName: 'FieldDetail',
      isHarvestLive: true,
      groups: groups(true),
      recentIds: ['sell', 'income', 'sacks'],
    });
    expect(moves.map((m) => m.id)).toEqual([
      'scheduleWork',
      'recordWork',
      'observation',
      'expense',
    ]);
  });

  it('uses money presets including sell, not sacks', () => {
    const moves = buildQuickAddMoves({
      routeName: 'Money',
      groups: groups(false),
      recentIds: ['sacks', 'add'],
    });
    expect(moves.map((m) => m.id)).toEqual(['income', 'expense', 'sell']);
    expect(moves.find((move) => move.id === 'sell')).toMatchObject({
      surface: 'warehouse',
      action: 'sell',
    });
  });

  it('uses warehouse presets without income', () => {
    expect(
      buildQuickAddMoves({
        routeName: 'MyOil',
        groups: groups(false),
        recentIds: ['income'],
      }).map((m) => m.id)
    ).toEqual(['add', 'sell', 'give', 'fill']);
  });

  it('does not default grove to the first available field', () => {
    expect(
      resolveCaptureFieldId({
        availableIds: ['first', 'second'],
      })
    ).toBe('');
  });
});

describe('resolveCaptureFieldId', () => {
  it('prefers context, then route, then remembered', () => {
    expect(
      resolveCaptureFieldId({
        contextFieldId: 'ctx',
        routeFieldId: 'route',
        lastCaptureFieldId: 'last',
        lastMoneyFieldId: 'money',
        availableIds: ['ctx', 'route', 'last', 'money'],
      })
    ).toBe('ctx');
  });
});

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
    ).toBe('harvest');
  });

  it('prefers sourcePage over route', () => {
    expect(
      resolveQuickAddContext({ routeName: 'ChronologioTab', sourcePage: 'tasks' })
    ).toBe('tasks');
  });
});

describe('buildQuickAddMoves', () => {
  it('shows the universal four on home when harvest is closed', () => {
    const moves = buildQuickAddMoves({
      routeName: 'ChronologioTab',
      isHarvestLive: false,
      groups: groups(false),
    });
    expect(moves.map((m) => m.id)).toEqual(['work', 'observation', 'expense', 'photo']);
  });

  it('prioritises harvest actions inside harvest', () => {
    const moves = buildQuickAddMoves({
      routeName: 'HarvestCampaign',
      isHarvestLive: true,
      groups: groups(true),
    });
    expect(moves.map((m) => m.id)).toEqual(['sacks', 'mill', 'oil', 'expense']);
  });

  it('keeps two context-fixed slots before recent', () => {
    const moves = buildQuickAddMoves({
      routeName: 'FieldDetail',
      groups: groups(false),
      recentIds: ['expense', 'photo'],
    });
    expect(moves.map((m) => m.id)).toEqual(['work', 'observation', 'expense', 'photo']);
  });

  it('uses money presets including oil sale and payment', () => {
    const moves = buildQuickAddMoves({
      routeName: 'Money',
      groups: groups(false),
    });
    expect(moves.map((m) => m.id)).toEqual(['expense', 'income', 'oil_sale', 'payment']);
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

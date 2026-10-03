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
    expect(resolveQuickAddContext({ pathname: '/harvest' })).toBe('harvest');
    expect(resolveQuickAddContext({ pathname: '/my-oil' })).toBe('warehouse');
    expect(resolveQuickAddContext({ pathname: '/money' })).toBe('money');
    expect(resolveQuickAddContext({ pathname: '/fields/abc' })).toBe('grove');
    expect(resolveQuickAddContext({ pathname: '/tasks' })).toBe('tasks');
    expect(resolveQuickAddContext({ pathname: '/photos' })).toBe('photos');
    expect(resolveQuickAddContext({ pathname: '/chronologio' })).toBe('home');
    expect(resolveQuickAddContext({ pathname: '/chronologio', isHarvestLive: true })).toBe('harvest');
  });

  it('prefers sourcePage over pathname', () => {
    expect(
      resolveQuickAddContext({ pathname: '/chronologio', sourcePage: 'tasks' })
    ).toBe('tasks');
  });
});

describe('buildQuickAddMoves', () => {
  it('shows the universal four on home when harvest is closed', () => {
    const moves = buildQuickAddMoves({
      pathname: '/chronologio',
      isHarvestLive: false,
      groups: groups(false),
    });
    expect(moves.map((m) => m.id)).toEqual(['work', 'observation', 'expense', 'photo']);
  });

  it('prioritises harvest actions inside harvest', () => {
    const moves = buildQuickAddMoves({
      pathname: '/harvest',
      isHarvestLive: true,
      groups: groups(true),
    });
    expect(moves.map((m) => m.id)).toEqual(['sacks', 'mill', 'oil', 'expense']);
    expect(moves[0].surface).toBe('harvest');
  });

  it('surfaces cellar actions on my-oil', () => {
    const moves = buildQuickAddMoves({
      pathname: '/my-oil',
      groups: groups(false),
    });
    expect(moves.map((m) => m.id)).toEqual(['give', 'sell', 'hold', 'fill']);
  });

  it('keeps two context-fixed slots before recent', () => {
    const moves = buildQuickAddMoves({
      pathname: '/fields',
      groups: groups(false),
      recentIds: ['expense', 'photo'],
    });
    expect(moves.map((m) => m.id)).toEqual(['work', 'observation', 'expense', 'photo']);
  });

  it('uses money presets including oil sale and payment', () => {
    const moves = buildQuickAddMoves({
      pathname: '/money',
      groups: groups(false),
    });
    expect(moves.map((m) => m.id)).toEqual(['expense', 'income', 'oil_sale', 'payment']);
  });

  it('uses tasks and photos presets', () => {
    expect(
      buildQuickAddMoves({ pathname: '/tasks', groups: groups(false) }).map((m) => m.id)
    ).toEqual(['work', 'observation', 'expense', 'photo']);
    expect(
      buildQuickAddMoves({ pathname: '/photos', groups: groups(false) }).map((m) => m.id)
    ).toEqual(['photo', 'observation', 'work', 'expense']);
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

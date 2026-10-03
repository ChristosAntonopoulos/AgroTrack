import { buildCaptureMenu, suggestHarvestKind } from './menu';
import { defaultCaptureTab, tabFromPreferredType } from './tabs';
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

describe('buildCaptureMenu', () => {
  it('always returns the four tabs in order', () => {
    const groups = buildCaptureMenu({
      permissions: owner,
      harvestKinds: [],
      isHarvestLive: false,
      canUseWarehouse: true,
    });
    expect(groups.map((group) => group.id)).toEqual(['day', 'grove', 'warehouse', 'money']);
    expect(groups[0].moves).toEqual([]);
    expect(groups[1].moves.map((move) => move.id)).toEqual([
      'work',
      'photo',
      'observation',
      'voice',
      'document',
    ]);
    expect(groups[2].moves.map((move) => move.id)).toEqual(['give', 'sell', 'hold', 'fill', 'count']);
    expect(groups[3].moves.map((move) => move.id)).toEqual([
      'income',
      'oil_sale',
      'expense',
      'payment',
    ]);
  });

  it('fills Ημέρα when harvest is live and features the waiting step', () => {
    const groups = buildCaptureMenu({
      permissions: owner,
      harvestKinds: ['sacks', 'mill', 'oil', 'people', 'expense', 'income', 'note'],
      isHarvestLive: true,
      canUseWarehouse: true,
      openSacks: 4,
    });
    expect(groups[0].moves.find((move) => move.id === 'mill')).toMatchObject({ featured: true });
    expect(groups[0].moves.map((move) => move.id)).toEqual([
      'sacks',
      'mill',
      'oil',
      'people',
      'expense',
      'income',
      'note',
    ]);
  });

  it('suggests oil when fruit is weighed and sacks are clear', () => {
    expect(suggestHarvestKind(['sacks', 'mill', 'oil'], 0, 120)).toBe('oil');
    expect(suggestHarvestKind(['sacks', 'mill', 'oil'], 2, 120)).toBe('mill');
  });
});

describe('defaultCaptureTab', () => {
  it('uses explicit tab first', () => {
    expect(defaultCaptureTab({ pathname: '/money', tab: 'grove' })).toBe('grove');
  });

  it('maps preferred type before the route', () => {
    expect(tabFromPreferredType('money')).toBe('money');
    expect(defaultCaptureTab({ pathname: '/fields', preferredType: 'work' })).toBe('grove');
  });

  it('follows the page when no override is set', () => {
    expect(defaultCaptureTab({ pathname: '/harvest' })).toBe('day');
    expect(defaultCaptureTab({ pathname: '/my-oil' })).toBe('warehouse');
    expect(defaultCaptureTab({ pathname: '/money' })).toBe('money');
    expect(defaultCaptureTab({ pathname: '/chronologio' })).toBe('grove');
  });

  it('prefers Ημέρα when harvest is live off money and cellar pages', () => {
    expect(defaultCaptureTab({ pathname: '/fields', isHarvestLive: true })).toBe('day');
    expect(defaultCaptureTab({ pathname: '/money', isHarvestLive: true })).toBe('money');
  });
});

import {
  chronologioPath,
  fieldPath,
  fieldStreamPath,
  fieldWeatherPath,
  harvestPath,
  moneyPath,
  photosPath,
  readFieldId,
  taskCompletePath,
  taskFormPath,
  taskPeekPath,
} from './intents';

describe('deep-link intents', () => {
  it('reads fieldId and the legacy field alias', () => {
    expect(readFieldId(new URLSearchParams('fieldId=grove-1'))).toBe('grove-1');
    expect(readFieldId(new URLSearchParams('field=grove-2'))).toBe('grove-2');
    expect(readFieldId(new URLSearchParams('fieldId=a&field=b'))).toBe('a');
    expect(readFieldId(new URLSearchParams())).toBe('');
  });

  it('builds home, field stream, and hub URLs with fieldId', () => {
    expect(chronologioPath({ focus: 'today' })).toBe('/chronologio?focus=today');
    expect(chronologioPath({ fieldId: 'f1', entry: 'e1' })).toBe(
      '/chronologio?entry=e1&fieldId=f1'
    );
    expect(fieldPath('f1')).toBe('/fields/f1');
    expect(fieldStreamPath('f1', { entry: 'e2' })).toBe(
      '/fields/f1?tab=chronologio&entry=e2'
    );
    expect(taskPeekPath('t1')).toBe('/tasks/t1');
    expect(taskCompletePath('t1')).toBe('/tasks/t1/complete');
    expect(taskFormPath({ fieldId: 'f1' })).toBe('/tasks/new?fieldId=f1');
    expect(moneyPath({ year: 2026, fieldId: 'f1', tx: 'tx-9' })).toBe(
      '/money?year=2026&fieldId=f1&tx=tx-9'
    );
    expect(photosPath({ fieldId: 'f1', photoId: 'p1' })).toBe(
      '/photos?fieldId=f1&photoId=p1'
    );
    expect(harvestPath({ fieldId: 'f1', harvestId: 'h1' })).toBe(
      '/harvest?fieldId=f1&harvestId=h1'
    );
    expect(harvestPath({ day: '2025-11-12' })).toBe('/harvest?day=2025-11-12');
    expect(harvestPath({ evening: true })).toBe('/harvest?evening=1');
    expect(fieldWeatherPath('f1')).toBe('/fields/f1/weather');
  });
});

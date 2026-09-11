import {
  DEFAULT_FIELD_COLOR,
  FIELD_COLOR_PRESETS,
  distinctFieldColors,
  resolveFieldColor,
} from './fieldColors';

describe('field colour cycle', () => {
  it('cycles through earthy presets when no colour is saved', () => {
    const a = resolveFieldColor(null, 'field-a');
    const b = resolveFieldColor(null, 'field-b');
    expect(FIELD_COLOR_PRESETS).toContain(a);
    expect(FIELD_COLOR_PRESETS).toContain(b);
    expect(a).toBe(resolveFieldColor(undefined, 'field-a'));
  });

  it('keeps a saved earth colour and remaps similar legacy browns', () => {
    expect(resolveFieldColor('#E8C547')).toBe('#E8C547');
    expect(resolveFieldColor('#2F6B4F')).toBe('#E8C547');
    expect(resolveFieldColor('#3D6EA8')).toBe('#B54422');
    expect(resolveFieldColor('#C17A3A')).toBe('#B54422');
    expect(DEFAULT_FIELD_COLOR).toBe('#E8C547');
  });

  it('gives colliding groves different colours from the cycle', () => {
    const colors = distinctFieldColors([
      { id: 'a', color: '#C17A3A' },
      { id: 'b', color: '#C17A3A' },
      { id: 'c', color: '#D4A84A' },
    ]);
    expect(new Set(Object.values(colors)).size).toBe(3);
    expect(colors.a).not.toBe(colors.b);
    expect(colors.b).not.toBe(colors.c);
  });
});

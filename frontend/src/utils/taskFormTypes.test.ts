import { TASK_FORM_TYPES, templateFromType, typeFromTemplate } from './taskFormTypes';

describe('task form types', () => {
  it('maps human types to catalogue codes without exposing them as labels', () => {
    expect(templateFromType('pruning')).toBe('T06');
    expect(templateFromType('fertilisation')).toBe('T05');
    expect(templateFromType('weeds')).toBe('T09');
    expect(templateFromType('irrigation')).toBe('T15');
    expect(templateFromType('inspection')).toBe('T02');
    expect(templateFromType('protection')).toBe('T14');
    expect(templateFromType('harvest')).toBe('T21');
    expect(templateFromType('maintenance')).toBe('T08');
    expect(templateFromType('transport')).toBeUndefined();
    expect(templateFromType('other')).toBeUndefined();
    expect(TASK_FORM_TYPES.every((option) => !option.labelKey.includes('T0'))).toBe(true);
  });

  it('recovers a type from a proposal template', () => {
    expect(typeFromTemplate('T06')).toBe('pruning');
    expect(typeFromTemplate('T18')).toBe('harvest');
    expect(typeFromTemplate('T99')).toBe('other');
  });
});

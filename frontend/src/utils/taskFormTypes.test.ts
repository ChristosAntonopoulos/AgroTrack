import { TASK_FORM_TYPES, checksForTemplate, templateFromType, typeFromTemplate } from './taskFormTypes';

describe('task form types', () => {
  it('maps the basic jobs to catalogue codes', () => {
    expect(templateFromType('irrigation')).toBe('T08');
    expect(templateFromType('fly')).toBe('T14');
    expect(templateFromType('fertilisation')).toBe('T05');
    expect(templateFromType('pruning')).toBe('T06');
    expect(templateFromType('weeds')).toBe('T09');
    expect(templateFromType('harvest')).toBe('T21');
    expect(templateFromType('other')).toBeUndefined();
    expect(TASK_FORM_TYPES).toHaveLength(7);
    expect(TASK_FORM_TYPES.every((option) => !option.labelKey.includes('T0'))).toBe(true);
  });

  it('recovers a type from a proposal template', () => {
    expect(typeFromTemplate('T06')).toBe('pruning');
    expect(typeFromTemplate('T18')).toBe('harvest');
    expect(typeFromTemplate('T15')).toBe('irrigation');
    expect(typeFromTemplate('T99')).toBe('other');
  });

  it('keeps each basic checklist to three checks', () => {
    expect(checksForTemplate('T08')).toHaveLength(3);
    expect(checksForTemplate('T14').map((item) => item.key)).toEqual(['catches', 'fruit', 'photos']);
    expect(checksForTemplate('T99')).toEqual([]);
  });
});

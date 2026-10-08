import { capabilitySummaryKey, isDeliverableEmail, levelForModules, modulesForRelationship } from './peopleAccess';

describe('peopleAccess', () => {
  it('requires a deliverable email', () => {
    expect(isDeliverableEmail('elena@example.com')).toBe(false);
    expect(isDeliverableEmail('elena@grove.gr')).toBe(true);
    expect(isDeliverableEmail('6912345678')).toBe(false);
  });

  it('maps relationship presets and task-level access', () => {
    expect(modulesForRelationship('Family')).toEqual(['fields', 'chronologio', 'harvest', 'money']);
    expect(modulesForRelationship('Collaborator')).toContain('tasks');
    expect(levelForModules(modulesForRelationship('Family'), 'Family')).toBe('view');
    expect(levelForModules(modulesForRelationship('Collaborator'), 'Collaborator')).toBe('work');
    expect(capabilitySummaryKey('work', ['tasks'])).toBe('work');
    expect(capabilitySummaryKey('view', ['harvest'])).toBe('view');
  });
});

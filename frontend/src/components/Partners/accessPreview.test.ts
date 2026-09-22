import { buildAccessPreview, moduleDiff, resolvedAccessLevel } from './accessPreview';

describe('accessPreview', () => {
  it('drops help down to view when Tasks is off', () => {
    expect(resolvedAccessLevel(['chronologio'], 'help')).toBe('view');
    expect(resolvedAccessLevel(['tasks', 'chronologio'], 'help')).toBe('help');
  });

  it('lists every enabled module and does not promise task updates without Tasks', () => {
    const lines = buildAccessPreview('Family', ['chronologio', 'photos'], 'help');
    const keys = lines.map((line) => line.key);
    expect(keys).toContain('family.preview.canViewChronologio');
    expect(keys).toContain('family.preview.canViewPhotos');
    expect(keys).toContain('family.preview.cannotOpen');
    expect(keys).not.toContain('family.preview.canManageTasks');
    expect(lines.find((line) => line.module === 'tasks' && line.kind === 'cannot')).toBeTruthy();
  });

  it('promises task updates only when Tasks is on and the level can write', () => {
    const help = buildAccessPreview('Family', ['tasks'], 'help').map((line) => line.key);
    expect(help).toContain('family.preview.canManageTasks');
    expect(help).toContain('family.preview.cannotCreateTasks');

    const work = buildAccessPreview('Family', ['tasks'], 'work').map((line) => line.key);
    expect(work).toContain('family.preview.canManageTasks');
    expect(work).toContain('family.preview.canCreateTasks');
    expect(work).toContain('family.preview.canCreateOwnRecords');
  });

  it('never promises documents or access management', () => {
    const lines = buildAccessPreview('Partner', ['documents', 'tasks', 'money'], 'work');
    expect(lines.some((line) => line.module === 'documents')).toBe(false);
    expect(lines.map((line) => line.key)).toContain('family.preview.cannotManageAccess');
    expect(lines.map((line) => line.key)).toContain('family.preview.cannotDeleteOthers');
  });

  it('summarizes added and removed modules', () => {
    expect(moduleDiff(['tasks', 'photos'], ['photos', 'money'])).toEqual({
      added: ['money'],
      removed: ['tasks'],
    });
  });
});

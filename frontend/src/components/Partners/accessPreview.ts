import {
  FieldAccessLevel,
  FieldModule,
  FieldPersonRole,
  capabilitiesForAccess,
} from '../../services/fieldPeopleService';

/** Documents remain stored but are not offered or promised this cycle. */
export const PICKABLE_MODULES: FieldModule[] = [
  'fields',
  'tasks',
  'photos',
  'money',
  'chronologio',
  'harvest',
];

export type PreviewLine = {
  id: string;
  kind: 'can' | 'cannot';
  key: string;
  module?: FieldModule;
};

export const tasksModuleEnabled = (modules: FieldModule[]) => modules.includes('tasks');

/** Help means "update tasks". Without Tasks, it collapses to view. */
export const resolvedAccessLevel = (
  modules: FieldModule[],
  accessLevel: FieldAccessLevel
): FieldAccessLevel => {
  if (accessLevel === 'help' && !tasksModuleEnabled(modules)) return 'view';
  return accessLevel;
};

export const buildAccessPreview = (
  role: FieldPersonRole,
  modules: FieldModule[],
  accessLevel: FieldAccessLevel
): PreviewLine[] => {
  const level = resolvedAccessLevel(modules, accessLevel);
  const caps = capabilitiesForAccess(role, modules, level);
  const lines: PreviewLine[] = [];

  for (const module of PICKABLE_MODULES) {
    const on = modules.includes(module);
    if (!on) {
      lines.push({ id: `closed-${module}`, kind: 'cannot', key: 'family.preview.cannotOpen', module });
      continue;
    }

    switch (module) {
      case 'tasks':
        if (caps.canManageTasks) {
          lines.push({ id: 'tasks-manage', kind: 'can', key: 'family.preview.canManageTasks', module });
        } else {
          lines.push({ id: 'tasks-view', kind: 'can', key: 'family.preview.canViewTasks', module });
        }
        if (level === 'work') {
          lines.push({ id: 'tasks-create', kind: 'can', key: 'family.preview.canCreateTasks', module });
        } else {
          lines.push({ id: 'tasks-no-create', kind: 'cannot', key: 'family.preview.cannotCreateTasks', module });
        }
        break;
      case 'photos':
        lines.push({
          id: caps.canUploadPhotos ? 'photos-upload' : 'photos-view',
          kind: 'can',
          key: caps.canUploadPhotos ? 'family.preview.canUploadPhotos' : 'family.preview.canViewPhotos',
          module,
        });
        break;
      case 'money':
        lines.push({ id: 'money-view', kind: 'can', key: 'family.preview.canViewMoney', module });
        if (level === 'work') {
          lines.push({ id: 'money-add', kind: 'can', key: 'family.preview.canAddMoney', module });
        } else {
          lines.push({ id: 'money-no-add', kind: 'cannot', key: 'family.preview.cannotAddMoney', module });
        }
        break;
      case 'chronologio':
        lines.push({ id: 'chrono-view', kind: 'can', key: 'family.preview.canViewChronologio', module });
        break;
      case 'harvest':
        lines.push({ id: 'harvest-view', kind: 'can', key: 'family.preview.canViewHarvest', module });
        break;
      default:
        lines.push({ id: `open-${module}`, kind: 'can', key: 'family.preview.canOpen', module });
    }
  }

  if (caps.canCreateRecords) {
    lines.push({ id: 'create-records', kind: 'can', key: 'family.preview.canCreateOwnRecords' });
  } else {
    lines.push({ id: 'no-create-records', kind: 'cannot', key: 'family.preview.cannotCreateRecords' });
  }

  if (level === 'view') {
    lines.push({ id: 'no-change', kind: 'cannot', key: 'family.preview.cannotChangeData' });
  }

  lines.push({ id: 'no-delete-others', kind: 'cannot', key: 'family.preview.cannotDeleteOthers' });
  lines.push({ id: 'no-access-admin', kind: 'cannot', key: 'family.preview.cannotManageAccess' });

  return lines;
};

export const moduleDiff = (from: FieldModule[], to: FieldModule[]) => {
  const pickableFrom = from.filter((module) => PICKABLE_MODULES.includes(module));
  const pickableTo = to.filter((module) => PICKABLE_MODULES.includes(module));
  return {
    added: pickableTo.filter((module) => !pickableFrom.includes(module)),
    removed: pickableFrom.filter((module) => !pickableTo.includes(module)),
  };
};

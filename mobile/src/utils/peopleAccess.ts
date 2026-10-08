import { FieldAccessLevel, FieldModule } from '../services/fieldPeopleService';

export const SUMMARY_MODULES: FieldModule[] = ['chronologio', 'photos', 'tasks', 'harvest', 'money'];

export const PICKABLE_MODULES: FieldModule[] = ['chronologio', 'photos', 'tasks', 'harvest', 'money'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NON_DELIVERABLE_TLDS = new Set(['invalid', 'test', 'localhost', 'example']);

export const isDeliverableEmail = (value: string): boolean => {
  const email = value.trim().toLowerCase();
  if (!email || email.length > 200 || !EMAIL_RE.test(email)) return false;
  const domain = email.slice(email.lastIndexOf('@') + 1);
  if (!domain || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;
  const tld = domain.split('.').pop() || '';
  return Boolean(tld) && !NON_DELIVERABLE_TLDS.has(tld);
};

/** Collaborator: History, Photos, Tasks. Family: History, Harvest, Money. */
export const modulesForRelationship = (relationship: 'Family' | 'Collaborator'): FieldModule[] =>
  relationship === 'Family'
    ? ['fields', 'chronologio', 'harvest', 'money']
    : ['fields', 'chronologio', 'photos', 'tasks'];

export const levelForModules = (
  modules: FieldModule[],
  relationship: 'Family' | 'Collaborator'
): FieldAccessLevel => (modules.includes('tasks') ? 'work' : relationship === 'Family' ? 'view' : 'work');

export const capabilitySummaryKey = (level: string, modules: string[]): 'view' | 'record' | 'work' | 'help' => {
  if (level === 'view') return 'view';
  if (level === 'help') return 'help';
  return modules.includes('tasks') ? 'work' : 'record';
};

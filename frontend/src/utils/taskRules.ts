import { Task, Evidence } from '../services/taskService';

export const requiresBeforeAfter = (taskType?: string) => {
  const t = (taskType || '').toLowerCase();
  // Olive demo: these tasks look best with a before/after proof.
  return t.includes('prun') || t.includes('spray') || t.includes('pest');
};

export const hasBeforeAfterEvidence = (task: Pick<Task, 'evidence' | 'type'>) => {
  if (!requiresBeforeAfter(task.type)) return true;
  const ev: Evidence[] = task.evidence || [];
  const hasBefore = ev.some((e) => (e.kind || 'general') === 'before' && !!e.photoUrl);
  const hasAfter = ev.some((e) => (e.kind || 'general') === 'after' && !!e.photoUrl);
  return hasBefore && hasAfter;
};


import { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Field } from '../services/fieldService';
import { resolveFieldCenter } from './fieldGeo';
import { FieldTask, isActiveFieldTask, isCompletedFieldTask } from '../services/fieldWorkService';
import { isTaskOverdue, sortTasksForList } from './taskListUtils';

export function countFieldLocations(fields: Field[]): number {
  if (fields.length === 0) return 0;
  const keys = new Set<string>();
  for (const f of fields) {
    const center = resolveFieldCenter(f);
    if (center) {
      keys.add(`${center.latitude.toFixed(1)}_${center.longitude.toFixed(1)}`);
    }
  }
  return keys.size > 0 ? keys.size : 1;
}

export function isTaskDueWithinDays(task: FieldTask, days: number): boolean {
  if (isCompletedFieldTask(task)) return false;
  const deadline = task.plannedStart ?? task.plannedEnd;
  if (!deadline) return false;
  const end = new Date();
  end.setDate(end.getDate() + days);
  end.setHours(23, 59, 59, 999);
  const d = new Date(deadline);
  return d.getTime() <= end.getTime();
}

export function countTasksDueThisWeek(tasks: FieldTask[]): number {
  return tasks.filter((t) => isTaskDueWithinDays(t, 7)).length;
}

export function countHighPriorityDueWeek(tasks: FieldTask[]): number {
  return tasks.filter((t) => isTaskDueWithinDays(t, 7) && isTaskOverdue(t)).length;
}

export function getAgendaTasks(tasks: FieldTask[], limit = 5): FieldTask[] {
  const open = tasks.filter(isActiveFieldTask);
  return sortTasksForList(open)
    .filter((t) => isTaskDueWithinDays(t, 7) || isTaskOverdue(t))
    .slice(0, limit);
}

export type DueStatusVariant = 'overdue' | 'tomorrow' | 'future';

export function getTaskDueVariant(task: FieldTask): DueStatusVariant {
  if (isTaskOverdue(task)) return 'overdue';
  const deadline = task.plannedStart ?? task.plannedEnd;
  if (!deadline) return 'future';
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  if (d.getTime() === tomorrow.getTime()) return 'tomorrow';
  return 'future';
}

export function getTaskTypeIcon(type: string): ComponentProps<typeof Ionicons>['name'] {
  const key = type.toLowerCase();
  if (key.includes('irrig')) return 'water-outline';
  if (key.includes('prun')) return 'cut-outline';
  if (key.includes('fertil')) return 'flask-outline';
  if (key.includes('harvest')) return 'basket-outline';
  if (key.includes('inspect')) return 'search-outline';
  if (key.includes('spray') || key.includes('pest')) return 'bug-outline';
  return 'leaf-outline';
}

export function fieldHealthStatus(
  field: Field,
  openTaskCount = 0,
  hasOverdue = false
): 'healthy' | 'monitor' {
  if (hasOverdue || openTaskCount > 4) return 'monitor';
  if (field.currentLifecycleYear === 'high' && openTaskCount > 2) return 'monitor';
  return 'healthy';
}

export function fieldGradientColors(fieldId: string): [string, string] {
  const hash = fieldId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hues: [string, string][] = [
    ['#5C7A1F', '#3D5214'],
    ['#6B8E6B', '#4A5A42'],
    ['#7A6B4F', '#5C5040'],
    ['#5A8A6A', '#3D6650'],
  ];
  return hues[hash % hues.length];
}

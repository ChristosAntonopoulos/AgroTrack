import { useState, useEffect, useCallback } from 'react';
import { Activity } from '../services/activityService';
import { Task } from '../services/taskService';
import { Field } from '../services/fieldService';
import { getActivityService } from '../services/serviceFactory';

function activitiesFromCompletedTasks(tasks: Task[], fields: Field[]): Activity[] {
  return tasks
    .filter(t => t.status === 'completed' && t.actualEnd)
    .sort((a, b) => new Date(b.actualEnd!).getTime() - new Date(a.actualEnd!).getTime())
    .slice(0, 5)
    .map(t => ({
      id: `task-${t.id}`,
      fieldId: t.fieldId,
      type: 'task_completed',
      message: t.title,
      taskId: t.id,
      timestamp: t.actualEnd!,
    }));
}

export interface UseRecentActivitiesResult {
  activities: Activity[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export const useRecentActivities = (
  fields: Field[],
  tasks: Task[] = []
): UseRecentActivitiesResult => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const slice = fields.slice(0, 3);
      const batches = await Promise.all(
        slice.map(f => getActivityService().getActivities(f.id, 5).catch(() => [] as Activity[]))
      );
      const merged = batches.flat().sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      if (merged.length > 0) {
        setActivities(merged);
      } else {
        setActivities(activitiesFromCompletedTasks(tasks, fields));
      }
    } catch {
      setActivities(activitiesFromCompletedTasks(tasks, fields));
    } finally {
      setLoading(false);
    }
  }, [fields, tasks]);

  useEffect(() => {
    if (fields.length > 0 || tasks.length > 0) {
      load();
    } else {
      setActivities([]);
      setLoading(false);
    }
  }, [load, fields.length, tasks.length]);

  return { activities, loading, refresh: load };
};

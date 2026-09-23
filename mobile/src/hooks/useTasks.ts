import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFieldWorkService, getFieldService } from '../services/serviceFactory';
import {
  FieldTask,
  isActiveFieldTask,
} from '../services/fieldWorkService';
import { Field } from '../services/fieldService';
import { EntityCache } from '../utils/entityCache';
import { isDeviceOnline } from '../utils/networkStatus';
import { useOfflineMode } from '../context/OfflineContext';
import { athensCalendarYear } from '../utils/athensDate';

export type TaskListFilter = 'all' | 'planned' | 'in_progress' | 'ready' | 'blocked';

export interface UseTasksOptions {
  fieldId?: string;
  filter?: TaskListFilter;
  resultYear?: number;
}

export interface UseTasksResult {
  tasks: FieldTask[];
  filteredTasks: FieldTask[];
  fields: Record<string, Field>;
  loading: boolean;
  error: string | null;
  filter: TaskListFilter;
  refresh: () => Promise<void>;
  setFilter: (filter: TaskListFilter) => void;
  fromCache: boolean;
}

export const useTasks = (options: UseTasksOptions = {}): UseTasksResult => {
  const { user } = useAuth();
  const { setShowingCachedData, syncGeneration } = useOfflineMode();
  const { fieldId, resultYear = athensCalendarYear(new Date()) } = options;
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [fields, setFields] = useState<Record<string, Field>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [filter, setFilter] = useState<TaskListFilter>('all');

  const loadTasks = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const online = await isDeviceOnline();

      const tasksData = (
        await getFieldWorkService().listFieldTasks({
            resultYear,
            ...(fieldId ? { fieldId } : {}),
          })
      ).filter(isActiveFieldTask);

      setTasks(tasksData);

      const fieldIds = [...new Set(tasksData.map((t) => t.fieldId))];
      const fieldsMap: Record<string, Field> = {};
      for (const id of fieldIds) {
        try {
          const field = await getFieldService().getField(id);
          fieldsMap[id] = field;
        } catch (err) {
          console.error(`Error loading field ${id}:`, err);
          const cached = await EntityCache.getField(id);
          if (cached) fieldsMap[id] = cached.data;
        }
      }
      setFields(fieldsMap);

      const cached = !online;
      setFromCache(cached);
      setShowingCachedData(cached);
    } catch (err: unknown) {
      if (user) {
        const cachedTasks = await EntityCache.getTasks(user.id);
        if (cachedTasks) {
          const data = cachedTasks.data.filter(
            (t) =>
              (!fieldId || t.fieldId === fieldId) &&
              (t.resultYear == null || t.resultYear === resultYear)
          );
          setTasks(data.filter(isActiveFieldTask));
          setFromCache(true);
          setShowingCachedData(true);
          setError(null);
          setLoading(false);
          return;
        }
      }
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      setFromCache(false);
      setShowingCachedData(false);
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [user, fieldId, resultYear, syncGeneration]);

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter((task) => String(task.status).toLowerCase() === filter);
  }, [tasks, filter]);

  return {
    tasks,
    filteredTasks,
    fields,
    loading,
    error,
    filter,
    refresh: loadTasks,
    setFilter,
    fromCache,
  };
};

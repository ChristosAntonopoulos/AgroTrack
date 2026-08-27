import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTaskService, getFieldService } from '../services/serviceFactory';
import { Task } from '../services/taskService';
import { Field } from '../services/fieldService';
import { EntityCache } from '../utils/entityCache';
import { isDeviceOnline } from '../utils/networkStatus';
import { useOfflineMode } from '../context/OfflineContext';

export interface UseTasksOptions {
  fieldId?: string;
  filter?: 'all' | 'pending' | 'in_progress' | 'completed' | 'approval';
}

export interface UseTasksResult {
  tasks: Task[];
  filteredTasks: Task[];
  fields: Record<string, Field>;
  loading: boolean;
  error: string | null;
  filter: 'all' | 'pending' | 'in_progress' | 'completed' | 'approval';
  refresh: () => Promise<void>;
  setFilter: (filter: 'all' | 'pending' | 'in_progress' | 'completed' | 'approval') => void;
  fromCache: boolean;
}

export const useTasks = (options: UseTasksOptions = {}): UseTasksResult => {
  const { user } = useAuth();
  const { setShowingCachedData, syncGeneration } = useOfflineMode();
  const { fieldId } = options;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [fields, setFields] = useState<Record<string, Field>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'in_progress' | 'completed' | 'approval'
  >('all');

  const loadTasks = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const online = await isDeviceOnline();

      let tasksData: Task[];
      if (fieldId) {
        tasksData = await getTaskService().getTasksByField(fieldId);
      } else {
        tasksData = await getTaskService().getAssignedTasks(user.id, user.role);
      }

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
          const data = fieldId
            ? cachedTasks.data.filter((t) => t.fieldId === fieldId)
            : cachedTasks.data;
          setTasks(data);
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
  }, [user, fieldId, syncGeneration]);

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    if (filter === 'approval') {
      return tasks.filter(
        (t) => (t as Task & { approvalStatus?: string }).approvalStatus === 'pending'
      );
    }
    return tasks.filter((task) => task.status === filter);
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

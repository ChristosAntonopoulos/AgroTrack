import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFieldService, getTaskService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import { sanitizeFields } from '../utils/dataSanitizer';
import { isTaskOverdue } from '../utils/taskListUtils';
import { countTasksToday } from '../utils/fieldDisplay';
import { EntityCache } from '../utils/entityCache';
import { isDeviceOnline } from '../utils/networkStatus';
import { useOfflineMode } from '../context/OfflineContext';

export interface UseFieldsResult {
  fields: Field[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  fieldTaskCounts: Record<string, number>;
  fieldOpenTaskCounts: Record<string, number>;
  fieldHasOverdue: Record<string, boolean>;
  fieldNextJobTitle: Record<string, string | undefined>;
  fieldTodayTaskCounts: Record<string, number>;
  fromCache: boolean;
}

export const useFields = (): UseFieldsResult => {
  const { user } = useAuth();
  const { setShowingCachedData, syncGeneration } = useOfflineMode();
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [fieldTaskCounts, setFieldTaskCounts] = useState<Record<string, number>>({});
  const [fieldOpenTaskCounts, setFieldOpenTaskCounts] = useState<Record<string, number>>({});
  const [fieldHasOverdue, setFieldHasOverdue] = useState<Record<string, boolean>>({});
  const [fieldNextJobTitle, setFieldNextJobTitle] = useState<Record<string, string | undefined>>({});
  const [fieldTodayTaskCounts, setFieldTodayTaskCounts] = useState<Record<string, number>>({});

  const buildTaskMaps = (sanitizedFields: Field[], tasks: Task[]) => {
    const counts: Record<string, number> = {};
    const openCounts: Record<string, number> = {};
    const overdue: Record<string, boolean> = {};
    const nextJob: Record<string, string | undefined> = {};

    const todayCounts: Record<string, number> = {};

    for (const field of sanitizedFields) {
      const fieldTasks = tasks.filter((t) => t.fieldId === field.id);
      counts[field.id] = fieldTasks.length;
      const open = fieldTasks.filter((t) => t.status !== 'completed');
      openCounts[field.id] = open.length;
      overdue[field.id] = open.some((t) => isTaskOverdue(t));
      todayCounts[field.id] = countTasksToday(fieldTasks);
      const next = [...open].sort((a, b) => {
        const ad = a.scheduledEnd ? new Date(a.scheduledEnd).getTime() : Number.POSITIVE_INFINITY;
        const bd = b.scheduledEnd ? new Date(b.scheduledEnd).getTime() : Number.POSITIVE_INFINITY;
        return ad - bd;
      })[0];
      nextJob[field.id] = next?.title;
    }

    setFieldTaskCounts(counts);
    setFieldOpenTaskCounts(openCounts);
    setFieldHasOverdue(overdue);
    setFieldNextJobTitle(nextJob);
    setFieldTodayTaskCounts(todayCounts);
  };

  const loadFields = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const online = await isDeviceOnline();
      const [fieldsData, tasksData] = await Promise.all([
        getFieldService().getFields(user.id, user.role),
        getTaskService().getAssignedTasks(user.id, user.role).catch(() => [] as Task[]),
      ]);

      const sanitizedFields = sanitizeFields(fieldsData);
      setFields(sanitizedFields);
      buildTaskMaps(sanitizedFields, tasksData);

      const cached = !online;
      setFromCache(cached);
      setShowingCachedData(cached);
    } catch (err: unknown) {
      const cached = await EntityCache.getFields(user.id);
      if (cached) {
        const sanitizedFields = sanitizeFields(cached.data);
        setFields(sanitizedFields);
        const tasksCached = await EntityCache.getTasks(user.id);
        buildTaskMaps(sanitizedFields, tasksCached?.data ?? []);
        setFromCache(true);
        setShowingCachedData(true);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load fields');
        setFromCache(false);
        setShowingCachedData(false);
        console.error('Error loading fields:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, [user, syncGeneration]);

  return {
    fields,
    loading,
    error,
    refresh: loadFields,
    fieldTaskCounts,
    fieldOpenTaskCounts,
    fieldHasOverdue,
    fieldNextJobTitle,
    fieldTodayTaskCounts,
    fromCache,
  };
};

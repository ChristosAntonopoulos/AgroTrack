import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFieldService, getTaskService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import { sanitizeFields } from '../utils/dataSanitizer';
import { isTaskOverdue } from '../utils/taskListUtils';

export interface UseFieldsResult {
  fields: Field[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  fieldTaskCounts: Record<string, number>;
  fieldOpenTaskCounts: Record<string, number>;
  fieldHasOverdue: Record<string, boolean>;
}

export const useFields = (): UseFieldsResult => {
  const { user } = useAuth();
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldTaskCounts, setFieldTaskCounts] = useState<Record<string, number>>({});
  const [fieldOpenTaskCounts, setFieldOpenTaskCounts] = useState<Record<string, number>>({});
  const [fieldHasOverdue, setFieldHasOverdue] = useState<Record<string, boolean>>({});

  const buildTaskMaps = (sanitizedFields: Field[], tasks: Task[]) => {
    const counts: Record<string, number> = {};
    const openCounts: Record<string, number> = {};
    const overdue: Record<string, boolean> = {};

    for (const field of sanitizedFields) {
      const fieldTasks = tasks.filter(t => t.fieldId === field.id);
      counts[field.id] = fieldTasks.length;
      const open = fieldTasks.filter(t => t.status !== 'completed');
      openCounts[field.id] = open.length;
      overdue[field.id] = open.some(t => isTaskOverdue(t));
    }

    setFieldTaskCounts(counts);
    setFieldOpenTaskCounts(openCounts);
    setFieldHasOverdue(overdue);
  };

  const loadFields = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const [fieldsData, tasksData] = await Promise.all([
        getFieldService().getFields(user.id, user.role),
        getTaskService().getAssignedTasks(user.id, user.role).catch(() => [] as Task[]),
      ]);

      const sanitizedFields = sanitizeFields(fieldsData);
      setFields(sanitizedFields);
      buildTaskMaps(sanitizedFields, tasksData);
    } catch (err: any) {
      setError(err.message || 'Failed to load fields');
      console.error('Error loading fields:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, [user]);

  return {
    fields,
    loading,
    error,
    refresh: loadFields,
    fieldTaskCounts,
    fieldOpenTaskCounts,
    fieldHasOverdue,
  };
};

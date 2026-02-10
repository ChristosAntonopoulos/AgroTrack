import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { taskService, Task } from '../services/taskService';
import { fieldService, Field } from '../services/fieldService';

export interface UseTasksOptions {
  fieldId?: string;
  filter?: 'all' | 'pending' | 'in_progress' | 'completed';
}

export interface UseTasksResult {
  tasks: Task[];
  filteredTasks: Task[];
  fields: Record<string, Field>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setFilter: (filter: 'all' | 'pending' | 'in_progress' | 'completed') => void;
}

export const useTasks = (options: UseTasksOptions = {}): UseTasksResult => {
  const { user } = useAuth();
  const { fieldId } = options;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [fields, setFields] = useState<Record<string, Field>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  const loadTasks = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      // taskService already returns correct types
      let tasksData: Task[];
      if (fieldId) {
        tasksData = await taskService.getTasksByField(fieldId);
      } else {
        tasksData = await taskService.getAssignedTasks(user.id, user.role);
      }

      setTasks(tasksData);

      // Load field information for tasks
      const fieldIds = [...new Set(tasksData.map(t => t.fieldId))];
      const fieldsMap: Record<string, Field> = {};
      for (const id of fieldIds) {
        try {
          const field = await fieldService.getField(id);
          fieldsMap[id] = field;
        } catch (err) {
          console.error(`Error loading field ${id}:`, err);
        }
      }
      setFields(fieldsMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [user, fieldId]);

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter(task => task.status === filter);
  }, [tasks, filter]);

  return {
    tasks,
    filteredTasks,
    fields,
    loading,
    error,
    refresh: loadTasks,
    setFilter,
  };
};

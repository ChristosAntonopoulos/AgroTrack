import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fieldService, Field } from '../services/fieldService';
import { taskService } from '../services/taskService';
import { sanitizeFields } from '../utils/dataSanitizer';

export interface UseFieldsResult {
  fields: Field[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  fieldTaskCounts: Record<string, number>;
}

export const useFields = (): UseFieldsResult => {
  const { user } = useAuth();
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldTaskCounts, setFieldTaskCounts] = useState<Record<string, number>>({});

  const loadFields = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const fieldsData = await fieldService.getFields(user.id, user.role);
      
      // Double-check sanitization in hook (defensive)
      const sanitizedFields = sanitizeFields(fieldsData);
      
      if (__DEV__) {
        console.log(`[useFields] Loaded ${sanitizedFields.length} fields`);
        // Check for string booleans
        sanitizedFields.forEach((field, index) => {
          if (field.irrigationStatus !== undefined && typeof field.irrigationStatus !== 'boolean') {
            console.warn(`[useFields] Field ${index} (${field.id}) has non-boolean irrigationStatus: ${typeof field.irrigationStatus}`);
          }
        });
      }
      
      setFields(sanitizedFields);

      // Load task counts for each field
      const counts: Record<string, number> = {};
      for (const field of sanitizedFields) {
        try {
          const tasks = await taskService.getTasksByField(field.id);
          counts[field.id] = tasks.length;
        } catch (err) {
          counts[field.id] = 0;
        }
      }
      setFieldTaskCounts(counts);
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
  };
};

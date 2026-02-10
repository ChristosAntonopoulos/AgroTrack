import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { lifecycleService, Lifecycle } from '../services/lifecycleService';
import { fieldService, Field } from '../services/fieldService';

export interface LifecycleWithField extends Lifecycle {
  field?: Field;
}

export interface UseLifecyclesResult {
  lifecycles: LifecycleWithField[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useLifecycles = (): UseLifecyclesResult => {
  const { user } = useAuth();
  const [lifecycles, setLifecycles] = useState<LifecycleWithField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLifecycles = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const lifecyclesData = await lifecycleService.getLifecycles(user.id, user.role);

      // Load field information for each lifecycle
      const lifecyclesWithFields = await Promise.all(
        lifecyclesData.map(async (lifecycle) => {
          try {
            // fieldService already returns correct types
            const field = await fieldService.getField(lifecycle.fieldId);
            return { ...lifecycle, field };
          } catch (err) {
            console.error(`Error loading field ${lifecycle.fieldId}:`, err);
            return { ...lifecycle };
          }
        })
      );

      setLifecycles(lifecyclesWithFields);
    } catch (err: any) {
      setError(err.message || 'Failed to load lifecycles');
      console.error('Error loading lifecycles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLifecycles();
  }, [user]);

  return {
    lifecycles,
    loading,
    error,
    refresh: loadLifecycles,
  };
};

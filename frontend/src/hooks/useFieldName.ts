import { useEffect, useState } from 'react';
import { getFieldService, isMockMode } from '../services/serviceFactory';

const cache = new Map<string, string>();

export const useFieldName = (fieldId: string | undefined): string | null => {
  const [name, setName] = useState<string | null>(() =>
    fieldId ? cache.get(fieldId) ?? null : null
  );

  useEffect(() => {
    if (!fieldId || isMockMode()) return;

    const cached = cache.get(fieldId);
    if (cached) {
      setName(cached);
      return;
    }

    let cancelled = false;
    getFieldService()
      .getField(fieldId)
      .then((field) => {
        cache.set(fieldId, field.name);
        if (!cancelled) setName(field.name);
      })
      .catch(() => {
        if (!cancelled) setName(null);
      });

    return () => {
      cancelled = true;
    };
  }, [fieldId]);

  return name;
};

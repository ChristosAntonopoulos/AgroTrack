import { useCallback, useEffect, useMemo, useState } from 'react';
import { addMonths, endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { getCalendarService, getFieldService } from '../services/serviceFactory';
import { CalendarEvent, CalendarFilters } from '../services/calendarService';
import { Field } from '../services/fieldService';

export const useCalendarEvents = (anchorDate: Date, filters: CalendarFilters) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const start = subMonths(startOfMonth(anchorDate), 1);
    const end = addMonths(endOfMonth(anchorDate), 1);
    return { start, end };
  }, [anchorDate]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const fieldsData = await getFieldService().getFields(user.id, user.role);
      setFields(fieldsData);
      const fieldNames = Object.fromEntries(fieldsData.map(f => [f.id, f.name]));
      const data = await getCalendarService().getEvents(
        range.start,
        range.end,
        user.id,
        user.role,
        fieldNames,
        filters
      );
      setEvents(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user, range.start, range.end, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const fieldMap = useMemo(
    () => new Map(fields.map(f => [f.id, f.name])),
    [fields]
  );

  return { events, fields, fieldMap, loading, error, refresh: load };
};

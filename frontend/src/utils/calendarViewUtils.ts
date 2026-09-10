import {
  addDays,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isToday,
  isTomorrow,
  startOfDay,
  startOfWeek,
  type Locale,
} from 'date-fns';
import { CalendarEvent } from '../services/calendarService';
import { getTaskCategoryColor } from './taskCategoryColors';

export type AgendaGroup = 'today' | 'tomorrow' | 'thisWeek' | 'later';

export const AGENDA_GROUP_ORDER: AgendaGroup[] = ['today', 'tomorrow', 'thisWeek', 'later'];

export function isEventCompleted(event: CalendarEvent): boolean {
  return event.status === 'completed';
}

export function isEventOverdue(event: CalendarEvent): boolean {
  if (isEventCompleted(event)) return false;
  if (event.type === 'deadline') return true;
  const end = new Date(event.end);
  return isBefore(end, startOfDay(new Date()));
}

export function getEventChipVariant(event: CalendarEvent): 'scheduled' | 'overdue' | 'completed' | 'deadline' {
  if (isEventCompleted(event)) return 'completed';
  if (isEventOverdue(event)) return 'overdue';
  if (event.type === 'deadline') return 'deadline';
  return 'scheduled';
}

export function getEventCategoryColor(event: CalendarEvent): string {
  if (event.color) return event.color;
  if (event.taskType) return getTaskCategoryColor(event.taskType);
  return '#6c757d';
}

export function shortenLabel(text: string, max = 20): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function getAgendaGroup(date: Date, ref = new Date()): AgendaGroup {
  const d = startOfDay(date);
  const today = startOfDay(ref);
  if (isSameDay(d, today)) return 'today';
  if (isTomorrow(d)) return 'tomorrow';
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  if (!isBefore(d, today) && !isAfter(d, weekEnd)) return 'thisWeek';
  return 'later';
}

export function groupEventsByAgenda(
  events: CalendarEvent[],
  ref = new Date()
): Record<AgendaGroup, CalendarEvent[]> {
  const groups: Record<AgendaGroup, CalendarEvent[]> = {
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
  };

  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
  for (const event of sorted) {
    groups[getAgendaGroup(new Date(event.start), ref)].push(event);
  }
  return groups;
}

export function groupEventsByField(
  events: CalendarEvent[],
  fieldMap: Map<string, string>
): { fieldId: string; fieldName: string; events: CalendarEvent[] }[] {
  const byField = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const fieldId = event.fieldId ?? 'unknown';
    const list = byField.get(fieldId) ?? [];
    list.push(event);
    byField.set(fieldId, list);
  }

  return Array.from(byField.entries())
    .map(([fieldId, fieldEvents]) => ({
      fieldId,
      fieldName: fieldMap.get(fieldId) ?? eventFieldLabel(fieldId, fieldEvents),
      events: fieldEvents.sort((a, b) => a.start.getTime() - b.start.getTime()),
    }))
    .sort((a, b) => a.fieldName.localeCompare(b.fieldName));
}

function eventFieldLabel(fieldId: string, events: CalendarEvent[]): string {
  return events[0]?.fieldName ?? fieldId;
}

export function partitionDayEvents(events: CalendarEvent[]) {
  const overdue = events.filter((e) => e.type !== 'deadline' && isEventOverdue(e));
  const completed = events.filter((e) => isEventCompleted(e));
  const deadlines = events.filter((e) => e.type === 'deadline' && !isEventCompleted(e));
  const scheduled = events.filter(
    (e) => e.type === 'task' && !isEventCompleted(e) && !isEventOverdue(e)
  );
  return { scheduled, overdue, completed, deadlines };
}

export function countCritical(events: CalendarEvent[]): number {
  return events.filter((e) => e.priority === 'Critical' && !isEventCompleted(e)).length;
}

export function formatDayHeader(date: Date, locale?: Locale): string {
  return format(date, 'EEE d MMM', { locale });
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function isDateSelected(date: Date, selected: Date): boolean {
  return isSameDay(date, selected);
}

export function isDateToday(date: Date): boolean {
  return isToday(date);
}

export function getEventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return events.filter((event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    return start < dayEnd && end >= dayStart;
  });
}

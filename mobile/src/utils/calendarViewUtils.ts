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
} from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { CalendarEvent } from '../services/calendarService';
import { getTaskCategoryColor } from './calendarCategoryColors';

export type AgendaGroup = 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'later';

export const AGENDA_GROUP_ORDER: AgendaGroup[] = [
  'overdue',
  'today',
  'tomorrow',
  'thisWeek',
  'later',
];

export function isEventCompleted(event: CalendarEvent): boolean {
  return event.status === 'completed';
}

export function isEventOverdue(event: CalendarEvent): boolean {
  if (isEventCompleted(event)) return false;
  if (event.type === 'deadline') return true;
  const end = new Date(event.end);
  return isBefore(end, startOfDay(new Date()));
}

export function getEventChipVariant(
  event: CalendarEvent
): 'scheduled' | 'overdue' | 'completed' | 'deadline' {
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

export function getAgendaGroup(date: Date, ref = new Date()): AgendaGroup {
  const d = startOfDay(date);
  const today = startOfDay(ref);
  if (isBefore(d, today)) return 'overdue';
  if (isSameDay(d, today)) return 'today';
  if (isTomorrow(d)) return 'tomorrow';
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  if (!isAfter(d, weekEnd)) return 'thisWeek';
  return 'later';
}

export function groupEventsByAgenda(
  events: CalendarEvent[],
  ref = new Date()
): Record<AgendaGroup, CalendarEvent[]> {
  const groups: Record<AgendaGroup, CalendarEvent[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
  };

  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
  for (const event of sorted) {
    if (isEventOverdue(event) && event.type !== 'deadline') {
      groups.overdue.push(event);
      continue;
    }
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
      fieldName: fieldMap.get(fieldId) ?? fieldEvents[0]?.fieldName ?? fieldId,
      events: fieldEvents.sort((a, b) => a.start.getTime() - b.start.getTime()),
    }))
    .sort((a, b) => a.fieldName.localeCompare(b.fieldName));
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function formatEventTime(date: Date, language: string): string {
  const locale = language === 'el' ? el : enUS;
  return format(date, 'HH:mm', { locale });
}

export function formatDayHeader(date: Date, language: string): string {
  const locale = language === 'el' ? el : enUS;
  return format(date, 'EEE d MMM', { locale });
}

export function isDateToday(date: Date): boolean {
  return isToday(date);
}

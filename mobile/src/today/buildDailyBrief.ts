import type { Field } from '../services/fieldService';
import type { Task } from '../services/taskService';
import type { Note } from '../services/noteService';
import type { WeatherData } from '../services/weatherService';

export type BriefProposalKind = 'stale_observation' | 'weather_rain' | 'harvest_hint';

export type BriefProposal = {
  id: string;
  kind: BriefProposalKind;
  priority: number;
  titleKey: string;
  fieldId?: string;
  fieldLabel?: string;
  reasonKey: string;
  reasonParams?: Record<string, string | number>;
  detailKey?: string;
  detailParams?: Record<string, string | number>;
  primaryAction: 'schedule' | 'capture' | 'weather';
  icon: 'harvest' | 'observe' | 'weather' | 'check';
};

export type RankedProposals = {
  featured: BriefProposal | null;
  secondary: BriefProposal[];
  hiddenCount: number;
};

export const friendlyFieldLabel = (name?: string | null): string => {
  if (!name || !name.trim()) return '—';
  let n = name.trim();
  n = n.replace(/^Olive\s+Field\s*[-–—:]\s*/i, '');
  n = n.replace(/^Ελαιώνας\s*[-–—:]\s*/i, '');
  n = n.replace(/\s*[-–—]\s*/g, ' · ');
  n = n.replace(/\s{2,}/g, ' ').trim();
  n = n.replace(/(\s·\s)+/g, ' · ');
  return n || name.trim();
};

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d: Date) => {
  const x = startOfDay(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const taskDueDate = (task: Task): Date | null => {
  const raw = task.scheduledStart || task.scheduledEnd;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const kmhToBeaufort = (kmh: number): number => {
  const ms = kmh / 3.6;
  if (ms < 0.3) return 0;
  if (ms < 1.6) return 1;
  if (ms < 3.4) return 2;
  if (ms < 5.5) return 3;
  if (ms < 8.0) return 4;
  if (ms < 10.8) return 5;
  return 6;
};

export const partitionTasks = (openTasks: Task[], now = new Date()) => {
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const overdue: Task[] = [];
  const today: Task[] = [];
  const upcoming: Task[] = [];

  for (const task of openTasks) {
    const due = taskDueDate(task);
    if (!due) {
      upcoming.push(task);
      continue;
    }
    if (due < dayStart) overdue.push(task);
    else if (due <= dayEnd) today.push(task);
    else upcoming.push(task);
  }

  const byTime = (a: Task, b: Task) => {
    const ad = taskDueDate(a)?.getTime() ?? Number.POSITIVE_INFINITY;
    const bd = taskDueDate(b)?.getTime() ?? Number.POSITIVE_INFINITY;
    return ad - bd;
  };

  overdue.sort(byTime);
  today.sort(byTime);
  upcoming.sort(byTime);

  return {
    todayWork: [...overdue, ...today],
    overdue,
    nextTasks: upcoming.slice(0, 3),
  };
};

export const buildConditionsStatus = (input: {
  weather: WeatherData | null;
  overdueCount: number;
  rainConflictCount: number;
}): { lineKey: string; lineParams?: Record<string, string | number>; alert?: boolean } => {
  if (input.overdueCount > 0) {
    return {
      lineKey: 'brief.conditions.overdue',
      lineParams: { count: input.overdueCount },
      alert: true,
    };
  }
  if (input.rainConflictCount > 0) {
    return {
      lineKey: 'brief.conditions.rainConflict',
      lineParams: { count: input.rainConflictCount },
      alert: true,
    };
  }
  if (input.weather?.frostLevel && input.weather.frostLevel !== 'None' && input.weather.frostLevel !== 'Low') {
    return { lineKey: 'brief.conditions.frost', alert: true };
  }
  return { lineKey: 'brief.conditions.ok' };
};

export const buildAndRankProposals = (input: {
  fields: Field[];
  notes: Note[];
  weather: WeatherData | null;
  todayWork: Task[];
  dismissedIds: Set<string>;
}): RankedProposals => {
  const { fields, notes, weather, todayWork, dismissedIds } = input;
  const raw: BriefProposal[] = [];
  const push = (p: BriefProposal) => {
    if (dismissedIds.has(p.id)) return;
    raw.push(p);
  };

  const rainMm = weather?.rainForecast24hMm ?? 0;
  if (rainMm >= 2 && todayWork.length > 0) {
    push({
      id: 'weather_rain:global',
      kind: 'weather_rain',
      priority: 100,
      titleKey: 'brief.proposals.rainCheckTitle',
      reasonKey: 'brief.proposals.rainCheckReasonShort',
      detailKey: 'brief.proposals.rainCheckReason',
      detailParams: { mm: Math.round(rainMm), count: todayWork.length },
      primaryAction: 'weather',
      fieldId: fields[0]?.id,
      icon: 'weather',
    });
  }

  for (const field of fields.slice(0, 6)) {
    const label = friendlyFieldLabel(field.name);
    const fieldNotes = notes.filter((n) => n.fieldId === field.id);
    const latest = fieldNotes
      .map((n) => n.occurredAt || n.createdAt)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
    const age = latest
      ? Math.floor((Date.now() - new Date(latest).getTime()) / (24 * 60 * 60 * 1000))
      : null;
    if (age == null || age >= 14) {
      push({
        id: `stale_observation:${field.id}`,
        kind: 'stale_observation',
        priority: age != null && age >= 21 ? 70 : 50,
        titleKey: 'brief.proposals.observeTitle',
        fieldId: field.id,
        fieldLabel: label,
        reasonKey: 'brief.proposals.observeDaysShort',
        detailKey: age == null ? 'brief.proposals.observeNever' : 'brief.proposals.observeDays',
        detailParams: age == null ? { field: label } : { days: age, field: label },
        primaryAction: 'capture',
        icon: 'observe',
      });
    }
  }

  raw.sort((a, b) => b.priority - a.priority);

  // Diversity: one proposal per field (keep highest)
  const seen = new Set<string>();
  const diversified: BriefProposal[] = [];
  for (const p of raw) {
    if (!p.fieldId) {
      diversified.push(p);
      continue;
    }
    if (seen.has(p.fieldId)) continue;
    seen.add(p.fieldId);
    diversified.push(p);
  }

  // Prefer field diversity in top 3
  const ordered: BriefProposal[] = [];
  const used = new Set<string>();
  const rest = [...diversified];
  while (rest.length && ordered.length < 3) {
    const idx = rest.findIndex((p) => !p.fieldId || !used.has(p.fieldId));
    const pick = idx >= 0 ? rest.splice(idx, 1)[0] : rest.shift()!;
    ordered.push(pick);
    if (pick.fieldId) used.add(pick.fieldId);
  }
  ordered.push(...rest);

  const featured = ordered[0] || null;
  const secondary = ordered.slice(1, 3);
  return {
    featured,
    secondary,
    hiddenCount: Math.max(0, ordered.length - 1 - secondary.length),
  };
};

export const buildTodayRoute = (input: {
  todayWork: Task[];
  fieldsById: Record<string, Field | undefined>;
}) => {
  const byField = new Map<string, Task>();
  for (const task of input.todayWork) {
    if (!byField.has(task.fieldId)) byField.set(task.fieldId, task);
  }
  const stops: Array<{
    fieldId: string;
    fieldName: string;
    taskTitle: string;
    taskId: string;
    latitude?: number;
    longitude?: number;
  }> = [];
  for (const [fieldId, task] of byField) {
    const field = input.fieldsById[fieldId];
    if (!field) continue;
    stops.push({
      fieldId,
      fieldName: friendlyFieldLabel(field.name),
      taskTitle: task.title,
      taskId: task.id,
      latitude: field.latitude,
      longitude: field.longitude,
    });
  }
  return stops;
};

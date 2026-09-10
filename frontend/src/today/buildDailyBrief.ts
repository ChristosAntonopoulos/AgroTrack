import type { Field } from '../services/fieldService';
import type { FieldTask } from '../services/fieldWorkService';
import type { Note } from '../services/noteService';
import type { WeatherData } from '../services/weatherService';
import type { Location } from '../services/locationService';
import { isTaskDueToday, isTaskOverdue, taskDueDate } from '../utils/taskListUtils';
import { calculateDistance } from '../services/locationService';
import { friendlyFieldLabel } from '../utils/fieldLabels';

export { friendlyFieldLabel, fieldLabelMap } from '../utils/fieldLabels';

export type BriefProposalKind =
  | 'stale_observation'
  | 'seasonal_check'
  | 'weather_rain'
  | 'harvest_window';

export type BriefPriority = 'critical' | 'high' | 'normal' | 'low';

export type BriefProposal = {
  id: string;
  kind: BriefProposalKind;
  priority: BriefPriority;
  /** i18n key under today: */
  titleKey: string;
  titleParams?: Record<string, string | number>;
  fieldId?: string;
  /** Presentation-only friendly label */
  fieldLabel?: string;
  /** One-line human reason */
  reasonKey: string;
  reasonParams?: Record<string, string | number>;
  /** Optional longer explanation (Γιατί;) */
  detailKey?: string;
  detailParams?: Record<string, string | number>;
  primaryAction: 'schedule' | 'capture' | 'weather' | 'open_task';
  taskId?: string;
  templateId?: string;
  icon: 'harvest' | 'observe' | 'weather' | 'check';
};

export type BriefRouteStop = {
  fieldId: string;
  fieldName: string;
  taskTitle: string;
  taskId: string;
  timeLabel?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  durationMin?: number;
};

export type RankedProposals = {
  featured: BriefProposal | null;
  secondary: BriefProposal[];
  hiddenCount: number;
  all: BriefProposal[];
};

export const kmhToBeaufort = (kmh: number): number => {
  const ms = kmh / 3.6;
  if (ms < 0.3) return 0;
  if (ms < 1.6) return 1;
  if (ms < 3.4) return 2;
  if (ms < 5.5) return 3;
  if (ms < 8.0) return 4;
  if (ms < 10.8) return 5;
  if (ms < 13.9) return 6;
  if (ms < 17.2) return 7;
  if (ms < 20.8) return 8;
  if (ms < 24.5) return 9;
  if (ms < 28.5) return 10;
  if (ms < 32.7) return 11;
  return 12;
};

export const partitionTasks = (openTasks: FieldTask[], now = new Date()) => {
  const overdue: FieldTask[] = [];
  const today: FieldTask[] = [];
  const upcoming: FieldTask[] = [];

  for (const task of openTasks) {
    if (isTaskOverdue(task, now)) overdue.push(task);
    else if (isTaskDueToday(task, now)) today.push(task);
    else upcoming.push(task);
  }

  const byTime = (a: FieldTask, b: FieldTask) => {
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
    dueToday: today,
    nextTasks: upcoming.slice(0, 3),
  };
};

export const buildConditionsStatus = (input: {
  weather: WeatherData | null;
  todayTaskCount: number;
  overdueCount: number;
  rainConflictCount: number;
}): { lineKey: string; lineParams?: Record<string, string | number>; alert?: boolean } => {
  const { weather, todayTaskCount, overdueCount, rainConflictCount } = input;
  if (overdueCount > 0) {
    return {
      lineKey: 'brief.conditions.overdue',
      lineParams: { count: overdueCount },
      alert: true,
    };
  }
  if (rainConflictCount > 0) {
    return {
      lineKey: 'brief.conditions.rainConflict',
      lineParams: { count: rainConflictCount },
      alert: true,
    };
  }
  if (weather?.frostLevel && weather.frostLevel !== 'None' && weather.frostLevel !== 'Low') {
    return { lineKey: 'brief.conditions.frost', alert: true };
  }
  if (todayTaskCount === 0) {
    return { lineKey: 'brief.conditions.calm' };
  }
  return { lineKey: 'brief.conditions.ok' };
};

const daysSince = (iso?: string | null): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
};

const KIND_SCORE: Record<BriefProposalKind, number> = {
  weather_rain: 100,
  harvest_window: 80,
  stale_observation: 55,
  seasonal_check: 45,
};

const PRIORITY_SCORE: Record<BriefPriority, number> = {
  critical: 40,
  high: 25,
  normal: 10,
  low: 0,
};

const isHarvestMonth = (month: number) => month >= 9 && month <= 12;

const looksLikeHarvest = (task: FieldTask): boolean => {
  const hay = `${task.templateCode || ''} ${task.title}`.toLowerCase();
  return hay.includes('harvest') || hay.includes('συγκομιδ') || hay.includes('τρύγ');
};

/** Collect candidates, then rank + dedupe for presentation. */
export const buildProposals = (input: {
  fields: Field[];
  openTasks: FieldTask[];
  notes: Note[];
  weather: WeatherData | null;
  todayWork: FieldTask[];
  dismissedIds: Set<string>;
}): BriefProposal[] => {
  const { fields, openTasks, notes, weather, todayWork, dismissedIds } = input;
  const month = new Date().getMonth() + 1;
  const proposals: BriefProposal[] = [];

  const push = (p: BriefProposal) => {
    if (dismissedIds.has(p.id)) return;
    if (proposals.some((x) => x.id === p.id)) return;
    proposals.push(p);
  };

  const rainMm = weather?.rainForecast24hMm ?? 0;
  if (rainMm >= 2 && todayWork.length > 0) {
    push({
      id: 'weather_rain:global',
      kind: 'weather_rain',
      priority: 'high',
      titleKey: 'brief.proposals.rainCheckTitle',
      reasonKey: 'brief.proposals.rainCheckReasonShort',
      reasonParams: { count: todayWork.length },
      detailKey: 'brief.proposals.rainCheckReason',
      detailParams: { mm: Math.round(rainMm), count: todayWork.length },
      primaryAction: 'weather',
      icon: 'weather',
    });
  }

  for (const field of fields.slice(0, 8)) {
    const label = friendlyFieldLabel(field.name);
    const fieldNotes = notes.filter((n) => n.fieldId === field.id);
    const latest = fieldNotes
      .map((n) => n.occurredAt || n.createdAt)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
    const age = daysSince(latest);

    if (age == null || age >= 14) {
      push({
        id: `stale_observation:${field.id}`,
        kind: 'stale_observation',
        priority: age != null && age >= 21 ? 'high' : 'normal',
        titleKey: 'brief.proposals.observeTitle',
        fieldId: field.id,
        fieldLabel: label,
        reasonKey: age == null ? 'brief.proposals.observeNeverShort' : 'brief.proposals.observeDaysShort',
        reasonParams: age == null ? {} : { days: age },
        detailKey: age == null ? 'brief.proposals.observeNever' : 'brief.proposals.observeDays',
        detailParams: age == null ? { field: label } : { days: age, field: label },
        primaryAction: 'capture',
        icon: 'observe',
      });
    }

    if (isHarvestMonth(month)) {
      const hasHarvestTask = openTasks.some(
        (t) => t.fieldId === field.id && looksLikeHarvest(t)
      );
      if (!hasHarvestTask) {
        push({
          id: `harvest_window:${field.id}`,
          kind: 'harvest_window',
          priority: 'high',
          titleKey: 'brief.proposals.harvestCheckTitle',
          fieldId: field.id,
          fieldLabel: label,
          reasonKey: 'brief.proposals.harvestCheckReasonShort',
          detailKey: 'brief.proposals.harvestCheckReason',
          detailParams: { field: label },
          primaryAction: 'schedule',
          icon: 'harvest',
        });
      }
    }
  }

  return proposals;
};

/**
 * Rank by urgency/kind, then diversify fields:
 * prefer one strong proposal per field when kinds compete.
 */
export const rankAndPresentProposals = (
  proposals: BriefProposal[],
  opts?: { featuredSlots?: number; secondarySlots?: number }
): RankedProposals => {
  const featuredSlots = opts?.featuredSlots ?? 1;
  const secondarySlots = opts?.secondarySlots ?? 2;

  const scored = [...proposals].sort((a, b) => {
    const sa = KIND_SCORE[a.kind] + PRIORITY_SCORE[a.priority];
    const sb = KIND_SCORE[b.kind] + PRIORITY_SCORE[b.priority];
    if (sa !== sb) return sb - sa;
    return a.id.localeCompare(b.id);
  });

  const byField = new Map<string, BriefProposal[]>();
  const global: BriefProposal[] = [];
  for (const p of scored) {
    if (!p.fieldId) {
      global.push(p);
      continue;
    }
    const list = byField.get(p.fieldId) || [];
    list.push(p);
    byField.set(p.fieldId, list);
  }

  const diversified: BriefProposal[] = [...global];
  for (const list of byField.values()) {
    const top = list[0];
    diversified.push(top);
    const second = list.find(
      (p) =>
        p.id !== top.id &&
        !(top.kind === 'harvest_window' && (p.kind === 'stale_observation' || p.kind === 'seasonal_check')) &&
        !(top.kind === 'stale_observation' && p.kind === 'seasonal_check')
    );
    if (second) diversified.push(second);
  }

  diversified.sort((a, b) => {
    const sa = KIND_SCORE[a.kind] + PRIORITY_SCORE[a.priority];
    const sb = KIND_SCORE[b.kind] + PRIORITY_SCORE[b.priority];
    return sb - sa;
  });

  const featured = diversified[0] ?? null;
  const secondary = diversified.slice(featuredSlots, featuredSlots + secondarySlots);
  const visibleIds = new Set(
    [featured, ...secondary].filter(Boolean).map((p) => (p as BriefProposal).id)
  );
  const hiddenCount = diversified.filter((p) => !visibleIds.has(p.id)).length;

  return { featured, secondary, hiddenCount, all: diversified };
};

export const buildTodayRoute = (input: {
  todayWork: FieldTask[];
  fields: Field[];
  currentLocation: Location | null;
}): BriefRouteStop[] => {
  const { todayWork, fields, currentLocation } = input;
  const byField = new Map<string, FieldTask>();
  for (const task of todayWork) {
    if (!byField.has(task.fieldId)) byField.set(task.fieldId, task);
  }

  const stops: BriefRouteStop[] = [];
  for (const [fieldId, task] of byField) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) continue;
    const lat = field.latitude;
    const lng = field.longitude;
    let distanceKm: number | undefined;
    if (currentLocation && typeof lat === 'number' && typeof lng === 'number') {
      distanceKm =
        calculateDistance(currentLocation.latitude, currentLocation.longitude, lat, lng) / 1000;
    }
    const due = taskDueDate(task);
    stops.push({
      fieldId,
      fieldName: field.name,
      taskTitle: task.title,
      taskId: task.id,
      timeLabel: due
        ? due.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        : undefined,
      latitude: lat,
      longitude: lng,
      distanceKm,
      durationMin: distanceKm != null ? Math.round((distanceKm / 40) * 60) : undefined,
    });
  }

  return stops.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
};

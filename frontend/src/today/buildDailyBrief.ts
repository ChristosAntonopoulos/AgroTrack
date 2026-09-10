import type { Field } from '../services/fieldService';
import type { Task } from '../services/taskService';
import type { Note } from '../services/noteService';
import type { WeatherData } from '../services/weatherService';
import type { Location } from '../services/locationService';
import { OLIVE_TASK_TEMPLATES } from '../data/oliveTaskTemplates';
import { isRecommendedNow } from '../utils/taskTemplateUtils';
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

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => {
  const x = startOfDay(d);
  x.setHours(23, 59, 59, 999);
  return x;
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

export const partitionTasks = (openTasks: Task[], now = new Date()) => {
  const overdue: Task[] = [];
  const today: Task[] = [];
  const upcoming: Task[] = [];

  for (const task of openTasks) {
    if (isTaskOverdue(task, now)) overdue.push(task);
    else if (isTaskDueToday(task, now)) today.push(task);
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

const CHECK_CATEGORIES = new Set([
  'Pest Monitoring',
  'Observation',
  'Irrigation',
  'Disease Management',
]);

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

const seasonalTitleKey = (templateId: string, category: string): string => {
  if (templateId === 'general_field_inspection' || category === 'Observation') {
    return 'brief.proposals.fieldCheckTitle';
  }
  if (category === 'Pest Monitoring') return 'brief.proposals.pestCheckTitle';
  if (category === 'Irrigation') return 'brief.proposals.irrigationCheckTitle';
  if (category === 'Disease Management') return 'brief.proposals.diseaseCheckTitle';
  return 'brief.proposals.seasonalGenericTitle';
};

const seasonalReasonKey = (templateId: string, category: string): string => {
  if (templateId === 'general_field_inspection' || category === 'Observation') {
    return 'brief.proposals.fieldCheckReason';
  }
  if (category === 'Pest Monitoring') return 'brief.proposals.pestCheckReason';
  if (category === 'Irrigation') return 'brief.proposals.irrigationCheckReason';
  return 'brief.proposals.seasonalGenericReason';
};

/** Collect candidates, then rank + dedupe for presentation. */
export const buildProposals = (input: {
  fields: Field[];
  openTasks: Task[];
  notes: Note[];
  weather: WeatherData | null;
  todayWork: Task[];
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

    const harvestTpl = OLIVE_TASK_TEMPLATES.find(
      (tpl) =>
        tpl.category === 'Harvest' && isRecommendedNow(tpl, month, field, openTasks, field.id)
    );
    if (harvestTpl) {
      const hasHarvestTask = openTasks.some(
        (t) =>
          t.fieldId === field.id &&
          (t.type === 'harvest' || t.templateId === harvestTpl.id)
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
          templateId: harvestTpl.id,
          icon: 'harvest',
        });
      }
    }

    const templates = OLIVE_TASK_TEMPLATES.filter(
      (tpl) =>
        CHECK_CATEGORIES.has(tpl.category) && isRecommendedNow(tpl, month, field, openTasks, field.id)
    ).slice(0, 1);

    for (const tpl of templates) {
      const alreadyScheduled = openTasks.some(
        (t) => t.fieldId === field.id && (t.templateId === tpl.id || t.type === tpl.category)
      );
      if (alreadyScheduled) continue;
      push({
        id: `seasonal_check:${field.id}:${tpl.id}`,
        kind: 'seasonal_check',
        priority: 'normal',
        titleKey: seasonalTitleKey(tpl.id, tpl.category),
        fieldId: field.id,
        fieldLabel: label,
        reasonKey: seasonalReasonKey(tpl.id, tpl.category),
        primaryAction: 'schedule',
        templateId: tpl.id,
        icon: 'check',
      });
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

  // Per-field: keep highest-scoring only when both harvest + observation/seasonal
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
    // Allow a second only if different kind family and still useful (e.g. harvest + weather already global)
    const second = list.find(
      (p) =>
        p.id !== top.id &&
        !(top.kind === 'harvest_window' && (p.kind === 'stale_observation' || p.kind === 'seasonal_check')) &&
        !(top.kind === 'stale_observation' && p.kind === 'seasonal_check')
    );
    if (second && KIND_SCORE[second.kind] >= 70) {
      diversified.push(second);
    }
  }

  diversified.sort((a, b) => {
    const sa = KIND_SCORE[a.kind] + PRIORITY_SCORE[a.priority];
    const sb = KIND_SCORE[b.kind] + PRIORITY_SCORE[b.priority];
    if (sa !== sb) return sb - sa;
    // Prefer field diversity in top slots
    return a.id.localeCompare(b.id);
  });

  // Re-order for diversity: avoid same field in first 3 if alternatives exist
  const ordered: BriefProposal[] = [];
  const usedFields = new Set<string>();
  const rest = [...diversified];
  while (rest.length && ordered.length < featuredSlots + secondarySlots) {
    const idx = rest.findIndex((p) => !p.fieldId || !usedFields.has(p.fieldId));
    const pick = idx >= 0 ? rest.splice(idx, 1)[0] : rest.shift()!;
    ordered.push(pick);
    if (pick.fieldId) usedFields.add(pick.fieldId);
  }
  ordered.push(...rest);

  const featured = ordered[0] || null;
  const secondary = ordered.slice(featuredSlots, featuredSlots + secondarySlots);
  const shown = featuredSlots + secondary.length;
  const hiddenCount = Math.max(0, ordered.length - shown);

  return {
    featured,
    secondary,
    hiddenCount,
    all: ordered,
  };
};

export const buildTodayRoute = (input: {
  todayWork: Task[];
  fields: Field[];
  currentLocation: Location | null;
}): BriefRouteStop[] => {
  const { todayWork, fields, currentLocation } = input;
  const byField = new Map<string, Task>();
  for (const task of todayWork) {
    if (!byField.has(task.fieldId)) byField.set(task.fieldId, task);
  }

  const stops: BriefRouteStop[] = [];
  for (const [fieldId, task] of byField) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) continue;
    const due = taskDueDate(task);
    let distanceKm: number | undefined;
    let durationMin: number | undefined;
    if (
      currentLocation &&
      typeof field.latitude === 'number' &&
      typeof field.longitude === 'number'
    ) {
      distanceKm =
        Math.round(
          calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            field.latitude,
            field.longitude
          ) * 10
        ) / 10;
      durationMin = Math.max(1, Math.round((distanceKm / 50) * 60));
    }
    stops.push({
      fieldId,
      fieldName: friendlyFieldLabel(field.name),
      taskTitle: task.title,
      taskId: task.id,
      timeLabel: due
        ? due.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
        : undefined,
      latitude: field.latitude,
      longitude: field.longitude,
      distanceKm,
      durationMin,
    });
  }

  if (currentLocation) {
    stops.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
  }

  return stops;
};

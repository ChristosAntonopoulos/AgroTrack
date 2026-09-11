import { useEffect, useMemo, useState } from 'react';
import type { Field } from '../services/fieldService';
import type { FieldTask } from '../services/fieldWorkService';
import type { FieldWeather } from '../services/geospatialService';
import type { Note } from '../services/noteService';
import { getFieldWorkService, getNoteService } from '../services/serviceFactory';
import { geospatialService } from '../services/geospatialService';
import { toWeatherData, type WeatherData } from '../services/weatherService';
import { agriculturalYearFor } from './agriculturalYear';
import {
  buildConditionsStatus,
  buildProposals,
  partitionTasks,
  rankAndPresentProposals,
  type BriefProposal,
} from '../today/buildDailyBrief';
import { getDismissedProposalIds } from '../today/dismissStore';
import { isActiveTask, isTaskOverdue } from '../utils/taskListUtils';
import { normalizeTaskStatus } from '../utils/categoryNormalize';

export type AttentionKind = 'warning' | 'task' | 'proposal' | 'calm';

export type AttentionItem = {
  kind: AttentionKind;
  titleKey: string;
  titleParams?: Record<string, string | number>;
  reasonKey: string;
  reasonParams?: Record<string, string | number>;
  action: 'open_task' | 'capture' | 'weather' | 'schedule' | 'tasks';
  taskId?: string;
  fieldId?: string;
};

const isOpenTask = (task: FieldTask) => {
  const status = normalizeTaskStatus(task.status);
  return status !== 'completed' && status !== 'cancelled';
};

const pickAttention = (input: {
  weather: WeatherData | null;
  overdue: FieldTask[];
  dueToday: FieldTask[];
  nextTasks: FieldTask[];
  featured: BriefProposal | null;
  rainConflictCount: number;
}): AttentionItem => {
  const { weather, overdue, dueToday, nextTasks, featured, rainConflictCount } = input;
  const frost = (weather?.frostLevel || '').toLowerCase();
  if (frost === 'high' || frost === 'critical') {
    return {
      kind: 'warning',
      titleKey: 'chronologio:today.attentionNeeded',
      reasonKey: 'today:brief.conditions.frost',
      action: 'weather',
      fieldId: featured?.fieldId,
    };
  }
  if (rainConflictCount > 0) {
    return {
      kind: 'warning',
      titleKey: 'chronologio:today.attentionNeeded',
      reasonKey: 'today:brief.conditions.rainConflict',
      reasonParams: { count: rainConflictCount },
      action: featured?.primaryAction === 'weather' ? 'weather' : 'tasks',
      fieldId: featured?.fieldId,
    };
  }
  if (featured && (featured.kind === 'weather_rain' || featured.kind === 'harvest_window')) {
    return {
      kind: 'proposal',
      titleKey: `today:${featured.titleKey}`,
      titleParams: featured.titleParams,
      reasonKey: `today:${featured.reasonKey}`,
      reasonParams: featured.reasonParams,
      action: featured.primaryAction === 'open_task' ? 'open_task' : featured.primaryAction,
      taskId: featured.taskId,
      fieldId: featured.fieldId,
    };
  }
  if (overdue[0]) {
    return {
      kind: 'task',
      titleKey: 'chronologio:today.attentionNeeded',
      reasonKey: 'today:brief.conditions.overdue',
      reasonParams: { count: overdue.length },
      action: 'open_task',
      taskId: overdue[0].id,
      fieldId: overdue[0].fieldId,
    };
  }
  if (featured) {
    return {
      kind: 'proposal',
      titleKey: `today:${featured.titleKey}`,
      titleParams: featured.titleParams,
      reasonKey: `today:${featured.reasonKey}`,
      reasonParams: featured.reasonParams,
      action: featured.primaryAction === 'open_task' ? 'open_task' : featured.primaryAction,
      taskId: featured.taskId,
      fieldId: featured.fieldId,
    };
  }
  if (dueToday[0]) {
    return {
      kind: 'task',
      titleKey: 'chronologio:today.todaysWork',
      reasonKey: 'chronologio:today.plannedTask',
      action: 'open_task',
      taskId: dueToday[0].id,
      fieldId: dueToday[0].fieldId,
    };
  }
  if (nextTasks[0]) {
    return {
      kind: 'task',
      titleKey: 'chronologio:today.nextTask',
      reasonKey: 'today:brief.nextSection',
      action: 'open_task',
      taskId: nextTasks[0].id,
      fieldId: nextTasks[0].fieldId,
    };
  }
  return {
    kind: 'calm',
    titleKey: 'today:brief.allQuietTitle',
    reasonKey: 'today:brief.allQuietNone',
    action: 'capture',
  };
};

export const useTodaySummary = (input: {
  enabled: boolean;
  fieldId?: string;
  fields: Field[];
}) => {
  const { enabled, fieldId, fields } = input;
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [fieldWeather, setFieldWeather] = useState<FieldWeather | null>(null);
  const [weatherFieldId, setWeatherFieldId] = useState<string | undefined>(fieldId);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const year = agriculturalYearFor(new Date());
    const scope = fieldId;
    const weatherId = scope || fields[0]?.id;
    setWeatherFieldId(weatherId);

    void Promise.all([
      getFieldWorkService()
        .listFieldTasks(scope ? { fieldId: scope, resultYear: year } : { resultYear: year })
        .catch(() => [] as FieldTask[]),
      getNoteService()
        .getNotes({ fieldId: scope, limit: 40 })
        .catch(() => [] as Note[]),
      weatherId
        ? geospatialService.getFieldWeather(weatherId).catch(() => null)
        : Promise.resolve(null),
    ]).then(([nextTasks, nextNotes, weather]) => {
      if (cancelled) return;
      setTasks(nextTasks);
      setNotes(nextNotes);
      setFieldWeather(weather);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, fieldId, fields]);

  const weather = useMemo(
    () => (fieldWeather ? toWeatherData(fieldWeather) : null),
    [fieldWeather]
  );

  const openTasks = useMemo(() => tasks.filter(isOpenTask), [tasks]);
  const partitioned = useMemo(() => partitionTasks(openTasks), [openTasks]);
  const rainConflictCount =
    (weather?.rainForecast24hMm ?? 0) >= 2 ? partitioned.todayWork.length : 0;

  const proposals = useMemo(
    () =>
      rankAndPresentProposals(
        buildProposals({
          fields: fieldId ? fields.filter((f) => f.id === fieldId) : fields,
          openTasks,
          notes,
          weather,
          todayWork: partitioned.todayWork,
          dismissedIds: getDismissedProposalIds(),
        })
      ),
    [fieldId, fields, notes, openTasks, partitioned.todayWork, weather]
  );

  const work = useMemo(() => {
    const soonWeather = openTasks
      .filter((task) => !isTaskOverdue(task) && isActiveTask(task) && task.weatherSuitability === 'poor')
      .slice(0, 3);
    const picked: FieldTask[] = [];
    for (const task of [...partitioned.overdue, ...partitioned.dueToday, ...soonWeather, ...partitioned.nextTasks]) {
      if (picked.some((x) => x.id === task.id)) continue;
      picked.push(task);
      if (picked.length >= 3) break;
    }
    return picked;
  }, [openTasks, partitioned.dueToday, partitioned.nextTasks, partitioned.overdue]);

  const attention = useMemo(
    () =>
      pickAttention({
        weather,
        overdue: partitioned.overdue,
        dueToday: partitioned.dueToday,
        nextTasks: partitioned.nextTasks,
        featured: proposals.featured,
        rainConflictCount,
      }),
    [partitioned.dueToday, partitioned.nextTasks, partitioned.overdue, proposals.featured, rainConflictCount, weather]
  );

  const conditions = useMemo(
    () =>
      buildConditionsStatus({
        weather,
        todayTaskCount: partitioned.dueToday.length,
        overdueCount: partitioned.overdue.length,
        rainConflictCount,
      }),
    [partitioned.dueToday.length, partitioned.overdue.length, rainConflictCount, weather]
  );

  return {
    attention,
    work,
    weather,
    fieldWeather,
    weatherFieldId,
    weatherField: fields.find((f) => f.id === weatherFieldId),
    conditions,
    overdueCount: partitioned.overdue.length,
  };
};

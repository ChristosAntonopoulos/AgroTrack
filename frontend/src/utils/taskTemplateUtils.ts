import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import {
  CategoryStyle,
  OliveTaskTemplate,
  TaskTemplateCategory,
  TaskTemplateFilters,
  TaskTemplatePriority,
  TaskTemplateSeason,
  TimingStatus,
} from '../types/oliveTaskTemplate';

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const CATEGORY_STYLES: Record<TaskTemplateCategory, CategoryStyle> = {
  Observation: { bg: '#e8f0fe', border: '#4285f4', text: '#1a56db', chipBg: '#dbeafe' },
  'Soil & Analysis': { bg: '#f3ebe3', border: '#8b6914', text: '#6b4f1d', chipBg: '#ede0d4' },
  Fertilization: { bg: '#e8f5e9', border: '#2e7d32', text: '#1b5e20', chipBg: '#c8e6c9' },
  Irrigation: { bg: '#e0f7fa', border: '#00838f', text: '#006064', chipBg: '#b2ebf2' },
  Pruning: { bg: '#f3e5f5', border: '#7b1fa2', text: '#6a1b9a', chipBg: '#e1bee7' },
  'Weed Management': { bg: '#f1f8e9', border: '#689f38', text: '#558b2f', chipBg: '#dcedc8' },
  'Pest Monitoring': { bg: '#fbe9e7', border: '#e64a19', text: '#bf360c', chipBg: '#ffccbc' },
  'Disease Management': { bg: '#fff8e1', border: '#f9a825', text: '#f57f17', chipBg: '#ffecb3' },
  Harvest: { bg: '#fffde7', border: '#f9a825', text: '#8d6e00', chipBg: '#fff9c4' },
  Equipment: { bg: '#eceff1', border: '#607d8b', text: '#455a64', chipBg: '#cfd8dc' },
  'Post-Harvest': { bg: '#e8eaf6', border: '#3949ab', text: '#283593', chipBg: '#c5cae9' },
};

export const PRIORITY_VARIANT: Record<TaskTemplatePriority, 'primary' | 'info' | 'warning' | 'error'> = {
  Low: 'primary',
  Medium: 'info',
  High: 'warning',
  Critical: 'error',
};

const SEASON_MONTHS: Record<Exclude<TaskTemplateSeason, 'All year'>, number[]> = {
  Winter: [12, 1, 2],
  Spring: [3, 4, 5],
  Summer: [6, 7, 8],
  Autumn: [9, 10, 11],
  'Harvest season': [9, 10, 11, 12],
};

export const TASK_CATEGORIES: Array<TaskTemplateCategory | 'All'> = [
  'All',
  'Observation',
  'Soil & Analysis',
  'Fertilization',
  'Irrigation',
  'Pruning',
  'Weed Management',
  'Pest Monitoring',
  'Disease Management',
  'Harvest',
  'Equipment',
  'Post-Harvest',
];

export const TASK_SEASONS: TaskTemplateSeason[] = [
  'All year',
  'Winter',
  'Spring',
  'Summer',
  'Autumn',
  'Harvest season',
];

export const TASK_PRIORITIES: Array<TaskTemplatePriority | 'All'> = ['All', 'Low', 'Medium', 'High', 'Critical'];

export const isMonthInTemplate = (template: OliveTaskTemplate, month: number, includeOptional = true): boolean => {
  if (template.primaryMonths.includes(month)) return true;
  return includeOptional && template.optionalMonths.includes(month);
};

export const isAllYearTemplate = (template: OliveTaskTemplate): boolean =>
  template.primaryMonths.length === 12;

export const formatMonthRange = (template: OliveTaskTemplate): string => {
  if (isAllYearTemplate(template)) return 'All year';
  const months = [...new Set([...template.primaryMonths, ...template.optionalMonths])].sort((a, b) => a - b);
  if (months.length === 0) return '—';
  if (months.length === 1) return MONTH_LABELS[months[0] - 1];
  const contiguous = months.every((m, i) => i === 0 || m === months[i - 1] + 1);
  if (contiguous) {
    return `${MONTH_LABELS[months[0] - 1]} - ${MONTH_LABELS[months[months.length - 1] - 1]}`;
  }
  return months.map((m) => MONTH_LABELS[m - 1]).join(', ');
};

export const formatPrimaryMonthRange = (
  template: OliveTaskTemplate,
  getMonthShort: (month: number) => string = (m) => MONTH_LABELS[m - 1]
): string => {
  if (isAllYearTemplate(template)) return 'All year';
  const months = [...template.primaryMonths].sort((a, b) => a - b);
  if (months.length === 0) return '—';
  if (months.length === 1) return getMonthShort(months[0]);
  const contiguous = months.every((m, i) => i === 0 || m === months[i - 1] + 1);
  if (contiguous) {
    return `${getMonthShort(months[0])} - ${getMonthShort(months[months.length - 1])}`;
  }
  return months.map((m) => getMonthShort(m)).join(', ');
};

export const getMonthChips = (
  template: OliveTaskTemplate,
  getMonthShort: (month: number) => string = (m) => MONTH_LABELS[m - 1],
  allYearLabel = 'All year'
): string[] => {
  if (isAllYearTemplate(template)) return [allYearLabel];
  const primary = [...template.primaryMonths].sort((a, b) => a - b);
  const contiguous = primary.every((m, i) => i === 0 || m === primary[i - 1] + 1);
  if (contiguous && primary.length > 2) {
    return [`${getMonthShort(primary[0])} - ${getMonthShort(primary[primary.length - 1])}`];
  }
  return primary.map((m) => getMonthShort(m));
};

const monthsWrapYear = (months: number[]): boolean => {
  if (months.length < 2) return false;
  const sorted = [...months].sort((a, b) => a - b);
  let maxGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    maxGap = Math.max(maxGap, sorted[i] - sorted[i - 1]);
  }
  const wrapGap = sorted[0] + 12 - sorted[sorted.length - 1];
  return wrapGap < maxGap;
};

export const getTimingStatus = (template: OliveTaskTemplate, currentMonth: number): TimingStatus => {
  if (isAllYearTemplate(template)) return 'recommended';
  if (isMonthInTemplate(template, currentMonth)) return 'recommended';

  const primary = [...template.primaryMonths].sort((a, b) => a - b);
  if (primary.length === 0) return 'none';

  const wraps = monthsWrapYear(primary);

  if (wraps) {
    const inGap =
      currentMonth > Math.max(...primary) && currentMonth < Math.min(...primary);
    if (inGap) {
      const monthsUntil = Math.min(...primary) - currentMonth;
      return monthsUntil > 0 && monthsUntil <= 2 ? 'coming_soon' : 'none';
    }
    return 'passed';
  }

  const earliest = Math.min(...primary);
  const latest = Math.max(...primary);

  if (currentMonth > latest) return 'passed';
  if (currentMonth < earliest) {
    const monthsUntil = earliest - currentMonth;
    return monthsUntil <= 2 ? 'coming_soon' : 'none';
  }
  return 'none';
};

export const isTemplateSuitableForField = (template: OliveTaskTemplate, field: Field | null): boolean => {
  if (!field) return true;
  if (template.requiresIrrigation && !field.irrigationStatus) return false;
  return true;
};

const RECENTLY_COMPLETED_DAYS = 45;

export const wasRecentlyCompleted = (
  template: OliveTaskTemplate,
  tasks: Task[],
  fieldId?: string
): boolean => {
  const cutoff = Date.now() - RECENTLY_COMPLETED_DAYS * 24 * 60 * 60 * 1000;
  return tasks.some((task) => {
    if (task.status !== 'completed') return false;
    if (fieldId && task.fieldId !== fieldId) return false;
    const completedAt = task.actualEnd || task.updatedAt;
    if (new Date(completedAt).getTime() < cutoff) return false;
    return task.templateId === template.id || task.title === template.title || task.type === template.category;
  });
};

export const isRecommendedNow = (
  template: OliveTaskTemplate,
  currentMonth: number,
  field: Field | null,
  tasks: Task[],
  fieldId?: string
): boolean => {
  if (!isMonthInTemplate(template, currentMonth)) return false;
  if (!isTemplateSuitableForField(template, field)) return false;
  if (wasRecentlyCompleted(template, tasks, fieldId)) return false;
  return true;
};

const priorityWeight: Record<TaskTemplatePriority, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const timingWeight: Record<TimingStatus, number> = {
  recommended: 4,
  coming_soon: 3,
  none: 2,
  passed: 1,
};

export const sortTemplates = (
  templates: OliveTaskTemplate[],
  currentMonth: number,
  field: Field | null,
  tasks: Task[],
  fieldId?: string
): OliveTaskTemplate[] => {
  return [...templates].sort((a, b) => {
    const aRec = isRecommendedNow(a, currentMonth, field, tasks, fieldId);
    const bRec = isRecommendedNow(b, currentMonth, field, tasks, fieldId);
    if (aRec !== bRec) return aRec ? -1 : 1;

    const aPri = priorityWeight[a.priority];
    const bPri = priorityWeight[b.priority];
    if (aPri !== bPri) return bPri - aPri;

    const aTiming = timingWeight[getTimingStatus(a, currentMonth)];
    const bTiming = timingWeight[getTimingStatus(b, currentMonth)];
    if (aTiming !== bTiming) return bTiming - aTiming;

    const aSeason = Math.min(...a.primaryMonths);
    const bSeason = Math.min(...b.primaryMonths);
    if (aSeason !== bSeason) return aSeason - bSeason;

    return a.title.localeCompare(b.title);
  });
};

export const matchesSeason = (template: OliveTaskTemplate, season: TaskTemplateSeason): boolean => {
  if (season === 'All year') return true;
  const seasonMonths = SEASON_MONTHS[season];
  return template.primaryMonths.some((m) => seasonMonths.includes(m));
};

export const filterTemplates = (
  templates: OliveTaskTemplate[],
  filters: TaskTemplateFilters,
  currentMonth: number,
  field: Field | null,
  tasks: Task[],
  fieldId?: string
): OliveTaskTemplate[] => {
  const search = filters.search.trim().toLowerCase();

  return templates.filter((template) => {
    if (search) {
      const haystack = [
        template.title,
        template.shortDescription,
        template.category,
        template.repetition,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    if (filters.category !== 'All' && template.category !== filters.category) return false;
    if (filters.priority !== 'All' && template.priority !== filters.priority) return false;
    if (!matchesSeason(template, filters.season)) return false;

    if (filters.recommendedOnly && !isRecommendedNow(template, currentMonth, field, tasks, fieldId)) {
      return false;
    }

    if (filters.fieldSuitableOnly && field && !isTemplateSuitableForField(template, field)) {
      return false;
    }

    return true;
  });
};

export const getSuggestedStartDate = (template: OliveTaskTemplate, selectedMonth?: number): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = selectedMonth ?? now.getMonth() + 1;

  let targetMonth = month;
  if (!isMonthInTemplate(template, month, false)) {
    const futurePrimary = template.primaryMonths.find((m) => m >= now.getMonth() + 1);
    targetMonth = futurePrimary ?? template.primaryMonths[0];
  }

  let targetYear = year;
  if (targetMonth < now.getMonth() + 1 && !isMonthInTemplate(template, now.getMonth() + 1, false)) {
    targetYear = year + 1;
  }

  const day = Math.max(now.getDate(), 1);
  const date = new Date(targetYear, targetMonth - 1, Math.min(day, 28), 9, 0);
  if (date < now && targetMonth === now.getMonth() + 1 && targetYear === year) {
    date.setDate(now.getDate());
    date.setHours(now.getHours() + 1, 0, 0, 0);
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const getSuggestedEndDate = (template: OliveTaskTemplate, startDate: string): string | undefined => {
  const primary = [...template.primaryMonths].sort((a, b) => a - b);
  if (primary.length === 0) return undefined;

  const start = new Date(startDate);
  const endMonth = Math.max(...primary);
  let endYear = start.getFullYear();
  if (endMonth < start.getMonth() + 1) endYear += 1;

  const end = new Date(endYear, endMonth, 0, 17, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T17:00`;
};

export const buildCreateTaskUrl = (
  templateId: string,
  fieldId?: string,
  selectedMonth?: number
): string => {
  const params = new URLSearchParams({ templateId });
  if (fieldId) params.set('fieldId', fieldId);
  if (selectedMonth) params.set('month', String(selectedMonth));
  return `/tasks/new?${params.toString()}`;
};

export const getFieldContextDisplay = (field: Field | null) => {
  if (!field) return null;
  return {
    name: field.name,
    treeType: 'Olive trees',
    variety: field.variety || 'Mixed varieties',
    production: 'Olive oil',
    irrigation: field.irrigationStatus ? 'Drip irrigation' : 'Rain-fed',
    region: 'Greece',
    groundType: field.groundType || '—',
    area: field.area,
  };
};

export const getRecommendedMonthNames = (
  template: OliveTaskTemplate,
  getMonthShort: (month: number) => string = (m) => MONTH_LABELS[m - 1]
): string => {
  const months = [...new Set([...template.primaryMonths, ...template.optionalMonths])].sort((a, b) => a - b);
  return months.map((m) => getMonthShort(m)).join(', ');
};

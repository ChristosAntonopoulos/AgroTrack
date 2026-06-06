import { OliveTaskTemplate } from '../types/oliveTaskTemplate';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import {
  CATEGORY_STYLES,
  filterTemplates,
  isMonthInTemplate,
  isRecommendedNow,
  sortTemplates,
} from './taskTemplateUtils';
import { CalendarEvent } from '../services/calendarService';

export type RecommendedTemplateEntry = {
  template: OliveTaskTemplate;
  categoryColor: string;
  categoryBg: string;
  categoryBorder: string;
  recommended: boolean;
};

export const getRecommendedForMonth = (
  templates: OliveTaskTemplate[],
  month: number,
  field: Field | null,
  tasks: Task[],
  fieldId?: string
): RecommendedTemplateEntry[] => {
  const filtered = filterTemplates(
    templates,
    {
      search: '',
      category: 'All',
      season: 'All year',
      priority: 'All',
      recommendedOnly: false,
      fieldSuitableOnly: true,
    },
    month,
    field,
    tasks,
    fieldId
  ).filter((tpl) => isMonthInTemplate(tpl, month));

  const sorted = sortTemplates(filtered, month, field, tasks, fieldId);

  return sorted.map((template) => {
    const style = CATEGORY_STYLES[template.category];
    return {
      template,
      categoryColor: style.text,
      categoryBg: style.chipBg,
      categoryBorder: style.border,
      recommended: isRecommendedNow(template, month, field, tasks, fieldId),
    };
  });
};

export const getCategoryColorsForMonth = (
  entries: RecommendedTemplateEntry[]
): string[] => {
  const seen = new Set<string>();
  const colors: string[] = [];
  for (const entry of entries) {
    if (seen.has(entry.template.category)) continue;
    seen.add(entry.template.category);
    colors.push(entry.categoryBorder);
    if (colors.length >= 5) break;
  }
  return colors;
};

export const getEventsForDay = (events: CalendarEvent[], date: Date): CalendarEvent[] => {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return events.filter((event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    return start < dayEnd && end >= dayStart;
  });
};

export const getTaskCategoryColor = (type: string): string => {
  const style = CATEGORY_STYLES[type as keyof typeof CATEGORY_STYLES];
  return style?.border ?? '#6c757d';
};

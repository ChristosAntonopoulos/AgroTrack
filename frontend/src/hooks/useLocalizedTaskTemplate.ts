import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { OliveTaskTemplate, TaskTemplateCategory, TaskTemplatePriority } from '../types/oliveTaskTemplate';
import { OLIVE_TASK_TEMPLATES } from '../data/oliveTaskTemplates';
import { MONTH_LABELS } from '../utils/taskTemplateUtils';

export type LocalizedOliveTaskTemplate = OliveTaskTemplate;

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

const tDefault = (t: TranslateFn, key: string, fallback: string): string =>
  t(key, { defaultValue: fallback });

const getLocalizedArray = (
  t: TranslateFn,
  key: string,
  fallback: string[]
): string[] => {
  const val = t(key, { returnObjects: true, defaultValue: fallback });
  return Array.isArray(val) ? (val as string[]) : fallback;
};

export const localizeTemplate = (
  template: OliveTaskTemplate,
  t: TranslateFn
): LocalizedOliveTaskTemplate => {
  const prefix = `templates.${template.id}`;
  return {
    ...template,
    title: tDefault(t, `${prefix}.title`, template.title),
    shortDescription: tDefault(t, `${prefix}.shortDescription`, template.shortDescription),
    whyItMatters: tDefault(t, `${prefix}.whyItMatters`, template.whyItMatters),
    timingExplanation: tDefault(t, `${prefix}.timingExplanation`, template.timingExplanation),
    monthTooltip: tDefault(t, `${prefix}.monthTooltip`, template.monthTooltip),
    repetition: tDefault(t, `${prefix}.repetition`, template.repetition),
    estimatedDuration: template.estimatedDuration
      ? tDefault(t, `${prefix}.estimatedDuration`, template.estimatedDuration)
      : undefined,
    checklist: getLocalizedArray(t, `${prefix}.checklist`, template.checklist),
    requiredInputs: getLocalizedArray(t, `${prefix}.requiredInputs`, template.requiredInputs),
    completionFields: getLocalizedArray(t, `${prefix}.completionFields`, template.completionFields),
    appliesTo: getLocalizedArray(t, `${prefix}.appliesTo`, template.appliesTo),
    warnings: template.warnings
      ? getLocalizedArray(t, `${prefix}.warnings`, template.warnings)
      : undefined,
  };
};

export const useTaskTemplateLabels = () => {
  const { t } = useTranslation('taskTemplates');

  return useMemo(
    () => ({
      categoryLabel: (category: TaskTemplateCategory | 'All') =>
        t(`categories.${category}`, String(category)),
      priorityLabel: (priority: TaskTemplatePriority | 'All') =>
        t(`priorities.${priority}`, String(priority)),
      seasonLabel: (season: string) => t(`seasons.${season}`, season),
      monthLabel: (month: number) =>
        t(`months.${month}`, MONTH_LABELS[month - 1]),
      monthShort: (month: number) =>
        t(`monthsShort.${month}`, MONTH_LABELS[month - 1]),
    }),
    [t]
  );
};

export const useLocalizedTemplate = (template: OliveTaskTemplate | null) => {
  const { t, i18n } = useTranslation('taskTemplates');
  return useMemo(() => {
    if (!template) return null;
    return localizeTemplate(template, t);
  }, [template, t, i18n.language]);
};

export const useLocalizedTemplates = (templates: OliveTaskTemplate[]) => {
  const { t, i18n } = useTranslation('taskTemplates');
  return useMemo(
    () => templates.map((tpl) => localizeTemplate(tpl, t)),
    [templates, t, i18n.language]
  );
};

export const useAllLocalizedTemplates = () => {
  return useLocalizedTemplates(OLIVE_TASK_TEMPLATES);
};

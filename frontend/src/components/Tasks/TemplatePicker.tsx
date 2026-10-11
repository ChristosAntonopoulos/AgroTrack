import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TaskSuggestion } from '../../services/taskService';
import {
  MINIMAL_TASK_TEMPLATES,
  minimalTemplateTitle,
} from '../../data/minimalTaskTemplates';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import TaskCategoryMark from './TaskCategoryMark';

export type TemplatePickerSelection =
  | {
      kind: 'template';
      templateCode: string;
      /** Set for "Suggested now" rows: the field the suggestion belongs to. */
      fieldId?: string;
      title: string;
      description: string;
      checklistLines: string[];
    }
  | { kind: 'custom' };

interface TemplatePickerProps {
  suggestions?: TaskSuggestion[];
  /** QA-035: field id → name so suggestion cards for different fields are distinguishable. */
  fields?: Array<{ id: string; name: string }>;
  language?: string;
  onSelect: (selection: TemplatePickerSelection) => void;
  onCancel: () => void;
}

const TemplatePicker: React.FC<TemplatePickerProps> = ({
  suggestions = [],
  fields = [],
  language = 'el',
  onSelect,
  onCancel,
}) => {
  const { t } = useTranslation('tasks');
  const lang = language.toLowerCase().startsWith('en') ? 'en' : 'el';
  // Only label cards when the suggestions could be confused (more than one field in play).
  const showFieldLabel = new Set(suggestions.map((item) => item.fieldId)).size > 1 || fields.length > 1;
  const fieldLabel = (fieldId: string) => {
    const field = fields.find((row) => row.id === fieldId);
    return field ? friendlyFieldLabel(field.name) : '';
  };

  return (
    <div className="schedule-template-picker">
      {suggestions.length > 0 ? (
        <section className="schedule-picker-section" aria-labelledby="schedule-suggested-now">
          <h3 id="schedule-suggested-now" className="schedule-picker-heading">
            {t('schedule.templates.suggestedNow')}
          </h3>
          <ul className="schedule-picker-list">
            {suggestions.map((item) => {
              const meta = MINIMAL_TASK_TEMPLATES.find(
                (row) => row.code.toUpperCase() === item.templateCode.toUpperCase()
              );
              const title = item.title || minimalTemplateTitle(item.templateCode, language);
              return (
                <li key={`${item.fieldId}-${item.templateCode}`}>
                  <button
                    type="button"
                    className="schedule-picker-row"
                    onClick={() =>
                      onSelect({
                        kind: 'template',
                        templateCode: item.templateCode,
                        fieldId: item.fieldId || undefined,
                        title,
                        description: meta?.description[lang] || '',
                        checklistLines: meta?.checklist[lang] || [],
                      })
                    }
                  >
                    <TaskCategoryMark templateCode={item.templateCode} />
                    <span className="schedule-picker-copy">
                      <span className="schedule-picker-title">{title}</span>
                      {showFieldLabel && fieldLabel(item.fieldId) ? (
                        <span className="schedule-picker-field">{fieldLabel(item.fieldId)}</span>
                      ) : null}
                      {item.whyNow ? (
                        <span className="schedule-picker-why">{item.whyNow}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="schedule-picker-section" aria-labelledby="schedule-curated">
        <h3 id="schedule-curated" className="schedule-picker-heading">
          {t('schedule.templates.curated')}
        </h3>
        <ul className="schedule-picker-list">
          {MINIMAL_TASK_TEMPLATES.map((item) => (
            <li key={item.code}>
              <button
                type="button"
                className="schedule-picker-row"
                onClick={() =>
                  onSelect({
                    kind: 'template',
                    templateCode: item.code,
                    title: item.title[lang],
                    description: item.description[lang],
                    checklistLines: item.checklist[lang],
                  })
                }
              >
                <TaskCategoryMark templateCode={item.code} />
                <span className="schedule-picker-copy">
                  <span className="schedule-picker-title">{item.title[lang]}</span>
                  <span className="schedule-picker-why">{item.description[lang]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        className="schedule-picker-custom"
        onClick={() => onSelect({ kind: 'custom' })}
      >
        {t('schedule.templates.writeOwn')}
      </button>

      <button type="button" className="schedule-picker-cancel" onClick={onCancel}>
        {t('schedule.cancel')}
      </button>
    </div>
  );
};

export default TemplatePicker;

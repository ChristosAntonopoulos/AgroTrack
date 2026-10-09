import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TaskSuggestion } from '../../services/taskService';
import {
  MINIMAL_TASK_TEMPLATES,
  minimalTemplateTitle,
} from '../../data/minimalTaskTemplates';
import TaskCategoryMark from './TaskCategoryMark';

export type TemplatePickerSelection =
  | {
      kind: 'template';
      templateCode: string;
      title: string;
      description: string;
      checklistLines: string[];
    }
  | { kind: 'custom' };

interface TemplatePickerProps {
  suggestions?: TaskSuggestion[];
  language?: string;
  onSelect: (selection: TemplatePickerSelection) => void;
  onCancel: () => void;
}

const TemplatePicker: React.FC<TemplatePickerProps> = ({
  suggestions = [],
  language = 'el',
  onSelect,
  onCancel,
}) => {
  const { t } = useTranslation('tasks');
  const lang = language.toLowerCase().startsWith('en') ? 'en' : 'el';

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
                        title,
                        description: meta?.description[lang] || '',
                        checklistLines: meta?.checklist[lang] || [],
                      })
                    }
                  >
                    <TaskCategoryMark templateCode={item.templateCode} />
                    <span className="schedule-picker-copy">
                      <span className="schedule-picker-title">{title}</span>
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

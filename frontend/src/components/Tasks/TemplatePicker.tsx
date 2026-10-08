import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CURATED_TASK_TEMPLATE_CODES,
  type TaskSuggestion,
} from '../../services/taskService';
import {
  FIELD_WORK_TEMPLATE_META,
  templateTitle,
  type FieldWorkCategory,
} from '../../data/fieldWorkCatalogueLabels';
import TaskCategoryMark from './TaskCategoryMark';

const CATEGORY_ORDER: FieldWorkCategory[] = [
  'pruning',
  'fertilisation',
  'ground',
  'monitoring',
  'irrigation',
  'harvest',
  'inspection',
  'other',
];

export type TemplatePickerSelection =
  | { kind: 'template'; templateCode: string; title: string }
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
  const [category, setCategory] = useState<FieldWorkCategory | 'all'>('all');

  const curated = useMemo(
    () =>
      CURATED_TASK_TEMPLATE_CODES.map((code) => ({
        code,
        title: templateTitle(code, language),
        category: FIELD_WORK_TEMPLATE_META[code]?.category || 'other',
      })),
    [language]
  );

  const categories = useMemo(() => {
    const present = new Set(curated.map((item) => item.category));
    return CATEGORY_ORDER.filter((item) => present.has(item));
  }, [curated]);

  const visible = curated.filter(
    (item) => category === 'all' || item.category === category
  );

  const suggestionCodes = new Set(suggestions.map((item) => item.templateCode.toUpperCase()));

  return (
    <div className="schedule-template-picker">
      {suggestions.length > 0 ? (
        <section className="schedule-picker-section" aria-labelledby="schedule-suggested-now">
          <h3 id="schedule-suggested-now" className="schedule-picker-heading">
            {t('schedule.templates.suggestedNow')}
          </h3>
          <ul className="schedule-picker-list">
            {suggestions.map((item) => (
              <li key={`${item.fieldId}-${item.templateCode}`}>
                <button
                  type="button"
                  className="schedule-picker-row"
                  onClick={() =>
                    onSelect({
                      kind: 'template',
                      templateCode: item.templateCode,
                      title: item.title || templateTitle(item.templateCode, language),
                    })
                  }
                >
                  <TaskCategoryMark templateCode={item.templateCode} />
                  <span className="schedule-picker-copy">
                    <span className="schedule-picker-title">
                      {item.title || templateTitle(item.templateCode, language)}
                    </span>
                    {item.whyNow ? (
                      <span className="schedule-picker-why">{item.whyNow}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="schedule-picker-section" aria-labelledby="schedule-curated">
        <h3 id="schedule-curated" className="schedule-picker-heading">
          {t('schedule.templates.curated')}
        </h3>
        <div className="schedule-category-chips" role="group" aria-label={t('schedule.templates.categories')}>
          <button
            type="button"
            className={`task-type-chip${category === 'all' ? ' is-selected' : ''}`}
            onClick={() => setCategory('all')}
          >
            {t('schedule.templates.allCategories')}
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={`task-type-chip${category === item ? ' is-selected' : ''}`}
              onClick={() => setCategory(item)}
            >
              {t(`schedule.templates.category.${item}`, { defaultValue: item })}
            </button>
          ))}
        </div>
        <ul className="schedule-picker-list">
          {visible.map((item) => (
            <li key={item.code}>
              <button
                type="button"
                className="schedule-picker-row"
                onClick={() =>
                  onSelect({
                    kind: 'template',
                    templateCode: item.code,
                    title: item.title,
                  })
                }
              >
                <TaskCategoryMark templateCode={item.code} />
                <span className="schedule-picker-copy">
                  <span className="schedule-picker-title">{item.title}</span>
                  {suggestionCodes.has(item.code) ? (
                    <span className="schedule-picker-why">{t('schedule.templates.alsoSuggested')}</span>
                  ) : null}
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

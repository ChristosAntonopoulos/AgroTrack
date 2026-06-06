import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, X } from 'lucide-react';
import { OliveTaskTemplate } from '../../types/oliveTaskTemplate';
import Badge from '../Common/Badge';
import Button from '../Common/Button';
import {
  CATEGORY_STYLES,
  PRIORITY_VARIANT,
  formatPrimaryMonthRange,
  getRecommendedMonthNames,
  isRecommendedNow,
} from '../../utils/taskTemplateUtils';
import { useTaskTemplateLabels } from '../../hooks/useLocalizedTaskTemplate';
import { Field } from '../../services/fieldService';
import { Task } from '../../services/taskService';
import './TaskTemplateDetailPanel.css';

interface TaskTemplateDetailPanelProps {
  template: OliveTaskTemplate | null;
  currentMonth: number;
  field: Field | null;
  tasks: Task[];
  fieldId?: string;
  selectedMonth?: number;
  onClose?: () => void;
  onCreate: () => void;
  mobile?: boolean;
}

const TaskTemplateDetailPanel: React.FC<TaskTemplateDetailPanelProps> = ({
  template,
  currentMonth,
  field,
  tasks,
  fieldId,
  selectedMonth,
  onClose,
  onCreate,
  mobile = false,
}) => {
  const { t } = useTranslation('taskTemplates');
  const labels = useTaskTemplateLabels();

  if (!template) {
    return (
      <div className={`tt-detail-panel tt-detail-empty ${mobile ? 'tt-detail-mobile' : ''}`}>
        <p>{t('calendar.selectTaskHint')}</p>
      </div>
    );
  }

  const style = CATEGORY_STYLES[template.category];
  const recommended = isRecommendedNow(template, currentMonth, field, tasks, fieldId);
  const monthRange = formatPrimaryMonthRange(template, labels.monthShort);

  return (
    <div className={`tt-detail-panel ${mobile ? 'tt-detail-mobile' : ''}`}>
      {mobile && onClose && (
        <button type="button" className="tt-detail-close" onClick={onClose} aria-label={t('detail.close')}>
          <X size={20} />
        </button>
      )}

      <div className="tt-detail-header">
        <h2>{template.title}</h2>
        {recommended && (
          <span className="tt-detail-now">
            <Sparkles size={14} />
            {t('detail.recommendedNow')}
          </span>
        )}
      </div>

      <div className="tt-detail-badges">
        <span
          className="tt-category-badge"
          style={{ background: style.chipBg, color: style.text, borderColor: style.border }}
        >
          {labels.categoryLabel(template.category)}
        </span>
        <Badge variant={PRIORITY_VARIANT[template.priority]} size="sm">
          {labels.priorityLabel(template.priority)}
        </Badge>
      </div>

      <section className="tt-detail-section">
        <h3>{t('detail.recommendedMonths')}</h3>
        <p>{getRecommendedMonthNames(template, labels.monthShort)}</p>
        {selectedMonth && (
          <p className="tt-detail-selected-month">
            {t('detail.selectedStartMonth', { month: labels.monthShort(selectedMonth) })}
          </p>
        )}
      </section>

      <section className="tt-detail-section">
        <h3>{t('detail.bestTiming')}</h3>
        <p>{template.timingExplanation}</p>
      </section>

      <section className="tt-detail-section">
        <h3>{t('detail.repetition')}</h3>
        <p>{template.repetition}</p>
        {template.estimatedDuration && (
          <p className="tt-detail-sub">{t('detail.duration', { value: template.estimatedDuration })}</p>
        )}
      </section>

      <section className="tt-detail-section">
        <h3>{t('detail.whyItMatters')}</h3>
        <p>{template.whyItMatters}</p>
      </section>

      <section className="tt-detail-section">
        <h3>{t('detail.requiredInputs')}</h3>
        <ul>
          {template.requiredInputs.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="tt-detail-section">
        <h3>{t('detail.checklist')}</h3>
        <ul>
          {template.checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="tt-detail-section tt-detail-autofill">
        <h3>{t('detail.autofillPreview')}</h3>
        <dl>
          <div><dt>{t('detail.autofillTitle')}</dt><dd>{template.title}</dd></div>
          <div><dt>{t('detail.autofillCategory')}</dt><dd>{labels.categoryLabel(template.category)}</dd></div>
          <div><dt>{t('detail.autofillRecurrence')}</dt><dd>{template.repetition}</dd></div>
          <div><dt>{t('detail.autofillStart')}</dt><dd>{t('detail.autofillStartHint', { range: monthRange })}</dd></div>
          <div><dt>{t('detail.autofillPriority')}</dt><dd>{labels.priorityLabel(template.priority)}</dd></div>
          <div><dt>{t('detail.autofillCompletion')}</dt><dd>{template.completionFields.join(', ')}</dd></div>
        </dl>
      </section>

      {template.warnings && template.warnings.length > 0 && (
        <section className="tt-detail-warnings">
          {template.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </section>
      )}

      <div className="tt-detail-actions">
        <Button variant="primary" fullWidth onClick={onCreate}>
          {t('detail.createTask')}
        </Button>
      </div>
    </div>
  );
};

export default TaskTemplateDetailPanel;

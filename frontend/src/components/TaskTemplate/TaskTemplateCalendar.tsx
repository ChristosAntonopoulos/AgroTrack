import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { OliveTaskTemplate } from '../../types/oliveTaskTemplate';
import Badge from '../Common/Badge';
import {
  CATEGORY_STYLES,
  PRIORITY_VARIANT,
  formatPrimaryMonthRange,
  getTimingStatus,
  isRecommendedNow,
} from '../../utils/taskTemplateUtils';
import { useTaskTemplateLabels } from '../../hooks/useLocalizedTaskTemplate';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { Field } from '../../services/fieldService';
import { Task } from '../../services/taskService';
import './TaskTemplateCalendar.css';

interface TaskTemplateCalendarProps {
  templates: OliveTaskTemplate[];
  selectedId: string | null;
  currentMonth: number;
  field: Field | null;
  tasks: Task[];
  fieldId?: string;
  highlightedIds: Set<string>;
  onSelect: (template: OliveTaskTemplate, month?: number) => void;
}

const TaskTemplateCalendar: React.FC<TaskTemplateCalendarProps> = ({
  templates,
  selectedId,
  currentMonth,
  field,
  tasks,
  fieldId,
  highlightedIds,
  onSelect,
}) => {
  const { t } = useTranslation('taskTemplates');
  const labels = useTaskTemplateLabels();
  const isCompact = useBreakpoint('lg');
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const monthHeaders = Array.from({ length: 12 }, (_, idx) => labels.monthShort(idx + 1));

  const showTooltip = (e: React.MouseEvent, template: OliveTaskTemplate) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const range = formatPrimaryMonthRange(template, labels.monthShort);
    setTooltip({
      text: `${template.monthTooltip}\n\n${t('calendar.tooltipWindow', { range })}`,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  };

  const hideTooltip = () => setTooltip(null);

  if (isCompact) {
    return (
      <div className="tt-calendar tt-calendar--list">
        <ul className="tt-calendar-list">
          {templates.map((template) => {
            const style = CATEGORY_STYLES[template.category];
            const recommended = isRecommendedNow(template, currentMonth, field, tasks, fieldId);
            const timing = getTimingStatus(template, currentMonth);
            const isSelected = selectedId === template.id;
            const range = formatPrimaryMonthRange(template, labels.monthShort);

            return (
              <li key={template.id}>
                <button
                  type="button"
                  className={[
                    'tt-calendar-list-item',
                    isSelected && 'tt-calendar-list-item-selected',
                    recommended && 'tt-calendar-list-item-recommended',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onSelect(template)}
                >
                  <div className="tt-calendar-task-name">{template.title}</div>
                  <div className="tt-calendar-task-badges">
                    <span
                      className="tt-category-badge"
                      style={{
                        background: style.chipBg,
                        color: style.text,
                        borderColor: style.border,
                      }}
                    >
                      {labels.categoryLabel(template.category)}
                    </span>
                    <Badge variant={PRIORITY_VARIANT[template.priority]} size="sm">
                      {labels.priorityLabel(template.priority)}
                    </Badge>
                    {recommended && (
                      <span className="tt-now-badge">
                        <Sparkles size={12} />
                        {t('calendar.now')}
                      </span>
                    )}
                    {timing === 'passed' && !recommended && (
                      <span className="tt-passed-badge">{t('calendar.passed')}</span>
                    )}
                  </div>
                  <div className="tt-calendar-list-range">{range}</div>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="tt-calendar-legend">
          <span className="tt-legend-item">
            <span className="tt-legend-bar tt-legend-primary" /> {t('calendar.legendPrimary')}
          </span>
          <span className="tt-legend-item">
            <span className="tt-legend-bar tt-legend-optional" /> {t('calendar.legendOptional')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="tt-calendar">
      <div className="tt-calendar-scroll">
        <div className="tt-calendar-grid">
          <div className="tt-calendar-header-row">
            <div className="tt-calendar-task-col tt-calendar-header-label">{t('calendar.taskColumn')}</div>
            {monthHeaders.map((label, idx) => {
              const month = idx + 1;
              const isCurrent = month === currentMonth;
              return (
                <div
                  key={label}
                  className={`tt-calendar-month-header ${isCurrent ? 'tt-current-month-col' : ''}`}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {templates.map((template) => {
            const style = CATEGORY_STYLES[template.category];
            const recommended = isRecommendedNow(template, currentMonth, field, tasks, fieldId);
            const timing = getTimingStatus(template, currentMonth);
            const isSelected = selectedId === template.id;
            const isHighlighted = highlightedIds.has(template.id);
            const isDimmed = highlightedIds.size > 0 && !isHighlighted;

            return (
              <div
                key={template.id}
                className={[
                  'tt-calendar-row',
                  isSelected && 'tt-calendar-row-selected',
                  recommended && 'tt-calendar-row-recommended',
                  isDimmed && 'tt-calendar-row-dimmed',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onSelect(template)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(template)}
              >
                <div className="tt-calendar-task-col">
                  <div className="tt-calendar-task-name">{template.title}</div>
                  <div className="tt-calendar-task-badges">
                    <span
                      className="tt-category-badge"
                      style={{
                        background: style.chipBg,
                        color: style.text,
                        borderColor: style.border,
                      }}
                    >
                      {labels.categoryLabel(template.category)}
                    </span>
                    <Badge variant={PRIORITY_VARIANT[template.priority]} size="sm">
                      {labels.priorityLabel(template.priority)}
                    </Badge>
                    {recommended && (
                      <span className="tt-now-badge">
                        <Sparkles size={12} />
                        {t('calendar.now')}
                      </span>
                    )}
                    {timing === 'passed' && !recommended && (
                      <span className="tt-passed-badge">{t('calendar.passed')}</span>
                    )}
                  </div>
                </div>

                {monthHeaders.map((_, idx) => {
                  const month = idx + 1;
                  const isPrimary = template.primaryMonths.includes(month);
                  const isOptional = template.optionalMonths.includes(month);
                  const isCurrent = month === currentMonth;

                  return (
                    <div
                      key={month}
                      className={`tt-calendar-month-cell ${isCurrent ? 'tt-current-month-col' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPrimary || isOptional) onSelect(template, month);
                      }}
                      onMouseEnter={(e) => (isPrimary || isOptional) && showTooltip(e, template)}
                      onMouseLeave={hideTooltip}
                    >
                      {isPrimary && (
                        <span
                          className="tt-month-bar tt-month-bar-primary"
                          style={{ background: style.bg, borderColor: style.border }}
                          aria-label={`${template.title} ${labels.monthShort(month)}`}
                        />
                      )}
                      {isOptional && !isPrimary && (
                        <span
                          className="tt-month-bar tt-month-bar-optional"
                          style={{
                            background: style.bg,
                            borderColor: style.border,
                            color: style.text,
                          }}
                          aria-label={`${template.title} ${labels.monthShort(month)}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="tt-calendar-legend">
        <span className="tt-legend-item">
          <span className="tt-legend-bar tt-legend-primary" /> {t('calendar.legendPrimary')}
        </span>
        <span className="tt-legend-item">
          <span className="tt-legend-bar tt-legend-optional" /> {t('calendar.legendOptional')}
        </span>
        <span className="tt-legend-item">
          <span className="tt-current-month-indicator" /> {t('calendar.legendCurrent')}
        </span>
      </div>

      {tooltip && (
        <div
          className="tt-calendar-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
          role="tooltip"
        >
          {tooltip.text.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskTemplateCalendar;

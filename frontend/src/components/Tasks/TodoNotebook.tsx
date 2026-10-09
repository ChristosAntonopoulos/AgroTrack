import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import type { Task, TaskSuggestion } from '../../services/taskService';
import {
  groupWorkUnits,
  isOpenWork,
  leadTask,
  resolveTaskPerson,
  unitSection,
  type NotebookMenuAction,
  type NotebookSection,
  type TaskUnit,
} from '../../utils/taskNotebook';
import TaskNotebookCard from './TaskNotebookCard';
import SuggestionCard from './SuggestionCard';
import TasksEmptyState from './TasksEmptyState';
import './TaskNotebookCard.css';

interface TodoNotebookProps {
  mode: 'today' | 'upcoming';
  tasks: Task[];
  fields: Field[];
  fieldNames: Record<string, string>;
  personNames: Record<string, string>;
  year: number;
  busyId: string | null;
  suggestions: TaskSuggestion[];
  onOpen: (task: Task) => void;
  onComplete: (task: Task) => void;
  onMenu: (task: Task, action: NotebookMenuAction) => void;
  onScheduleSuggestion: (suggestion: TaskSuggestion) => void;
  onDismissSuggestion: (suggestion: TaskSuggestion) => void;
}

const UPCOMING_SECTIONS: NotebookSection[] = ['tomorrow', 'week', 'later'];
const SUGGESTION_PREVIEW = 2;

const TodoNotebook: React.FC<TodoNotebookProps> = ({
  mode,
  tasks,
  fields,
  fieldNames,
  personNames,
  year,
  busyId,
  suggestions,
  onOpen,
  onComplete,
  onMenu,
  onScheduleSuggestion,
  onDismissSuggestion,
}) => {
  const { t } = useTranslation('tasks');
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const colorByField = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.id, field.color])),
    [fields]
  );

  const buckets = useMemo(() => {
    const units = groupWorkUnits(tasks.filter(isOpenWork));
    const bySection = new Map<NotebookSection, TaskUnit[]>();
    units.forEach((unit) => {
      const section = unitSection(unit);
      const list = bySection.get(section) || [];
      list.push(unit);
      bySection.set(section, list);
    });
    return bySection;
  }, [tasks]);

  const renderUnits = (sections: NotebookSection[], headingId: string, heading: string) => {
    const units = sections.flatMap((section) => buckets.get(section) || []);
    if (units.length === 0) return null;
    return (
      <section aria-labelledby={headingId}>
        <h2 id={headingId} className="notebook-section-title">
          {heading}
        </h2>
        <ul className="notebook-section-list">
          {units.map((unit) => {
            const person = resolveTaskPerson(leadTask(unit), personNames);
            return (
              <li key={unit.key}>
                <TaskNotebookCard
                  unit={unit}
                  fieldName={(id) => fieldNames[id] || t('fieldWork.unknownField')}
                  fieldColor={(id) => colorByField[id]}
                  personName={person || undefined}
                  year={year}
                  busy={unit.tasks.some((task) => task.id === busyId)}
                  onOpen={onOpen}
                  onComplete={onComplete}
                  onMenu={onMenu}
                />
              </li>
            );
          })}
        </ul>
      </section>
    );
  };

  if (mode === 'today') {
    const overdue = renderUnits(
      ['overdue'],
      'notebook-overdue',
      t('notebook.sections.overdue')
    );
    const today = renderUnits(['today'], 'notebook-today', t('notebook.sections.today'));
    const openLater = renderUnits(['later'], 'notebook-open', t('notebook.sections.open'));
    const hasWork = Boolean(overdue || today || openLater);
    const showSuggestions = suggestions.length > 0;
    const visibleSuggestions =
      showAllSuggestions || suggestions.length <= SUGGESTION_PREVIEW
        ? suggestions
        : suggestions.slice(0, SUGGESTION_PREVIEW);
    const hasMoreSuggestions = suggestions.length > SUGGESTION_PREVIEW;

    return (
      <div className="notebook-sections">
        {overdue}
        {today}
        {openLater}
        {showSuggestions ? (
          <section aria-labelledby="notebook-suggestions">
            <h2 id="notebook-suggestions" className="notebook-section-title">
              {t('notebook.sections.suggestions')}
            </h2>
            <ul className="notebook-section-list">
              {visibleSuggestions.map((suggestion, index) => (
                <li key={`${suggestion.fieldId}-${suggestion.templateCode}-${index}`}>
                  <SuggestionCard
                    suggestion={suggestion}
                    fieldName={fieldNames[suggestion.fieldId] || t('fieldWork.unknownField')}
                    busy={busyId === `suggestion:${suggestion.fieldId}:${suggestion.templateCode}`}
                    onSchedule={onScheduleSuggestion}
                    onDismiss={onDismissSuggestion}
                  />
                </li>
              ))}
            </ul>
            {hasMoreSuggestions ? (
              <button
                type="button"
                className="notebook-suggestions-more"
                onClick={() => setShowAllSuggestions((open) => !open)}
              >
                {showAllSuggestions
                  ? t('notebook.sections.showFewerSuggestions')
                  : t('notebook.sections.seeAllSuggestions')}
              </button>
            ) : null}
          </section>
        ) : null}
        {!hasWork && !showSuggestions ? (
          <TasksEmptyState
            title={t('notebook.empty.todayTitle')}
            description={t('notebook.empty.todayDescription')}
          />
        ) : null}
      </div>
    );
  }

  const sections = UPCOMING_SECTIONS.map((section) =>
    renderUnits(
      [section],
      `notebook-${section}`,
      t(`notebook.sections.${section === 'week' ? 'thisWeek' : section}`)
    )
  ).filter(Boolean);

  return (
    <div className="notebook-sections">
      {sections}
      {sections.length === 0 ? (
        <TasksEmptyState
          title={t('notebook.empty.upcomingTitle')}
          description={t('notebook.empty.upcomingDescription')}
        />
      ) : null}
    </div>
  );
};

export default TodoNotebook;

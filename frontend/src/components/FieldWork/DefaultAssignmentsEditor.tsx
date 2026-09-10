import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import OnboardingChoiceList from './OnboardingChoiceList';
import type { FieldMembership } from '../../services/fieldPeopleService';
import type { DefaultAssignments } from '../../services/fieldWorkService';
import {
  DEFAULT_ASSIGNMENT_CATEGORIES,
  choiceFromEntry,
  entryFromChoice,
  getAssignmentForCategory,
  type DefaultAssigneeChoice,
  upsertAssignmentEntry,
} from '../../utils/fieldWorkDefaultAssignments';

type Props = {
  value: DefaultAssignments;
  people: FieldMembership[];
  currentUserId?: string | null;
  disabled?: boolean;
  onChange: (next: DefaultAssignments) => void;
};

/**
 * Default assignees by category — suggest only; does not grant field access.
 */
const DefaultAssignmentsEditor: React.FC<Props> = ({
  value,
  people,
  currentUserId,
  disabled,
  onChange,
}) => {
  const { t } = useTranslation(['tasks', 'common']);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [pendingChoice, setPendingChoice] = useState<DefaultAssigneeChoice>('later');
  const [pendingCollab, setPendingCollab] = useState<string | null>(null);

  const collaborators = useMemo(
    () =>
      people.filter(
        (p) =>
          p.status === 'active' &&
          p.userId !== currentUserId &&
          (p.capacities?.includes('work') ||
            p.capacities?.includes('help') ||
            p.capacities?.includes('own'))
      ),
    [people, currentUserId]
  );

  const openEdit = (category: string) => {
    if (disabled) return;
    const entry = getAssignmentForCategory(value, category);
    const choice = choiceFromEntry(entry);
    setEditingCategory(category);
    setPendingChoice(choice);
    setPendingCollab(entry?.assigneeUserId ?? collaborators[0]?.userId ?? null);
  };

  const saveEdit = () => {
    if (!editingCategory) return;
    const entry = entryFromChoice(
      editingCategory,
      pendingChoice,
      pendingChoice === 'collaborator' ? pendingCollab : null
    );
    onChange(upsertAssignmentEntry(value, entry));
    setEditingCategory(null);
  };

  const personLabel = (userId: string | null | undefined) => {
    if (!userId) return '…';
    const p = people.find((x) => x.userId === userId);
    return p?.displayName || p?.email || userId;
  };

  return (
    <div className="fw-assign">
      <p className="fw-setup-hint">{t('tasks:fieldWork.profile.assignments.hint')}</p>
      <ul className="fw-profile-list">
        {DEFAULT_ASSIGNMENT_CATEGORIES.map((category) => {
          const entry = getAssignmentForCategory(value, category);
          const choice = choiceFromEntry(entry);
          let summary = t('tasks:fieldWork.profile.assignments.later');
          if (choice === 'me') summary = t('tasks:fieldWork.profile.assignments.me');
          if (choice === 'collaborator') {
            summary = t('tasks:fieldWork.profile.assignments.person', {
              name: personLabel(entry?.assigneeUserId),
            });
          }
          return (
            <li key={category} className="fw-profile-row">
              <div className="fw-profile-row-text">
                <strong>{t(`tasks:fieldWork.profile.categories.${category}`)}</strong>
                <span>{summary}</span>
              </div>
              <button
                type="button"
                className="fw-profile-change"
                disabled={disabled}
                onClick={() => openEdit(category)}
              >
                {t('tasks:fieldWork.profile.change')}
              </button>
            </li>
          );
        })}
      </ul>

      {editingCategory ? (
        <div className="fw-profile-panel" role="dialog" aria-modal="true">
          <h3 className="fw-setup-question">
            {t(`tasks:fieldWork.profile.categories.${editingCategory}`)}
          </h3>
          <OnboardingChoiceList
            selectedId={pendingChoice}
            onSelect={(id) => setPendingChoice(id as DefaultAssigneeChoice)}
            choices={[
              {
                id: 'me',
                title: t('tasks:fieldWork.profile.assignments.me'),
              },
              {
                id: 'collaborator',
                title: t('tasks:fieldWork.profile.assignments.collaborator'),
                description:
                  collaborators.length === 0
                    ? t('tasks:fieldWork.profile.assignments.noCollaborators')
                    : undefined,
              },
              {
                id: 'later',
                title: t('tasks:fieldWork.profile.assignments.later'),
              },
            ]}
          />
          {pendingChoice === 'collaborator' && collaborators.length > 0 ? (
            <div className="fw-setup-choices" style={{ marginTop: '0.75rem' }}>
              {collaborators.map((c) => (
                <button
                  key={c.userId}
                  type="button"
                  className={`fw-setup-choice${pendingCollab === c.userId ? ' is-selected' : ''}`}
                  onClick={() => setPendingCollab(c.userId)}
                >
                  <span className="fw-setup-choice-body">
                    <span className="fw-setup-choice-title">
                      {c.displayName || c.email || c.userId}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="fw-setup-actions">
            <button
              type="button"
              className="fw-setup-exit"
              onClick={() => setEditingCategory(null)}
            >
              {t('common:cancel', { defaultValue: 'Άκυρο' })}
            </button>
            <button
              type="button"
              className="fw-profile-change fw-profile-change--primary"
              onClick={saveEdit}
              disabled={
                pendingChoice === 'collaborator' &&
                (collaborators.length === 0 || !pendingCollab)
              }
            >
              {t('tasks:fieldWork.profile.save')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DefaultAssignmentsEditor;

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getFieldService, getFieldWorkService, getPartnerService } from '../services/serviceFactory';
import { fieldPeopleService, type FieldMembership } from '../services/fieldPeopleService';
import type { SavedContact } from '../services/partnerService';
import type { Field } from '../services/fieldService';
import type { TaskProposal } from '../services/fieldWorkService';
import { getApiErrorMessage } from '../utils/translateApiError';
import { templateTitle } from '../data/fieldWorkCatalogueLabels';
import { readStashedProposal } from '../utils/proposalPresentation';
import { buildTaskSearchParams } from '../utils/taskViewState';
import {
  assigneeOptionKey,
  suggestAssigneeFromProfile,
} from '../utils/fieldWorkLearning';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import BackLink from '../components/Common/BackLink';
import PageContainer from '../components/Common/PageContainer';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import TaskComposer, { type ComposerPayload } from '../components/Tasks/form/TaskComposer';
import type { AssigneeOption } from '../components/Tasks/form/AssigneeSelector';
import { useActiveFieldAccess } from '../hooks/useActiveFieldAccess';
import '../components/Tasks/form/TaskForm.css';

const TaskFormPage: React.FC = () => {
  const { t, i18n } = useTranslation(['tasks', 'common', 'errors']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { capabilities, accessLevel, isAdminOnActive, isCollaboratorOnActive } =
    useActiveFieldAccess();
  const canCreateTasks =
    isAdminOnActive ||
    !isCollaboratorOnActive ||
    Boolean(capabilities?.canManageTasks && accessLevel === 'work');
  const fieldIdParam = searchParams.get('fieldId') || '';
  const proposalIdParam = searchParams.get('proposalId') || '';
  const templateCodeParam = searchParams.get('templateCode') || '';

  useEffect(() => {
    if (!canCreateTasks) {
      navigate('/access-denied?module=tasks', { replace: true });
    }
  }, [canCreateTasks, navigate]);

  const stashed = proposalIdParam ? readStashedProposal() : null;
  const proposal: TaskProposal | null =
    stashed && stashed.id === proposalIdParam ? stashed : null;
  const mode = proposal ? 'proposal' : 'manual';

  const [fields, setFields] = useState<Field[]>([]);
  const [people, setPeople] = useState<FieldMembership[]>([]);
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldId, setFieldId] = useState(fieldIdParam || proposal?.fieldId || '');
  const [suggestedAssigneeKey, setSuggestedAssigneeKey] = useState(
    () => (user?.userId ? `user:${user.userId}` : 'later')
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fieldsData = await getFieldService().getFields().catch(() => [] as Field[]);
        if (cancelled) return;
        setFields(fieldsData);
        setFieldId((current) => current || fieldIdParam || proposal?.fieldId || fieldsData[0]?.id || '');
      } catch (err: unknown) {
        if (!cancelled) setError(getApiErrorMessage(err, t) || t('fieldWork.form.failedLoad'));
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fieldIdParam, proposal?.fieldId, t]);

  useEffect(() => {
    const meKey = user?.userId ? `user:${user.userId}` : 'later';
    if (!fieldId) {
      setPeople([]);
      setContacts([]);
      setSuggestedAssigneeKey(meKey);
      return;
    }
    let cancelled = false;
    (async () => {
      const [memberships, saved, workProfile] = await Promise.all([
        Promise.resolve(fieldPeopleService.getPeople(fieldId)).catch(() => [] as FieldMembership[]),
        Promise.resolve(
          getPartnerService().getContacts({ fieldId, includeUnassigned: true })
        ).catch(() => [] as SavedContact[]),
        Promise.resolve(getFieldWorkService().getWorkProfile?.(fieldId)).catch(() => null),
      ]);
      if (cancelled) return;
      setPeople(Array.isArray(memberships) ? memberships : []);
      setContacts(Array.isArray(saved) ? saved : []);
      if (mode === 'proposal' && proposal?.templateCode) {
        const suggestion = suggestAssigneeFromProfile(
          workProfile,
          proposal.templateCode,
          user?.userId
        );
        setSuggestedAssigneeKey(assigneeOptionKey(suggestion, user?.userId));
      } else {
        setSuggestedAssigneeKey(meKey);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fieldId, mode, proposal?.templateCode, user?.userId]);

  const capacityHint = (person: FieldMembership): { group: AssigneeOption['group']; hint: string } => {
    if (person.role === 'Family' || person.accessLevel === 'help') {
      return { group: 'family', hint: t('fieldWork.form.assigneeHintFamily') };
    }
    if (person.role === 'Partner' || person.accessLevel === 'work') {
      return { group: 'partner', hint: t('fieldWork.form.assigneeHintPartner') };
    }
    return { group: 'partner', hint: t('fieldWork.form.collaborator') };
  };

  const assigneeOptions = useMemo<AssigneeOption[]>(() => {
    const options: AssigneeOption[] = [
      {
        key: user?.userId ? `user:${user.userId}` : 'later',
        label: t('fieldWork.form.assigneeMe'),
        group: 'self',
      },
    ];
    people.forEach((person) => {
      if (person.userId && person.userId === user?.userId) return;
      if (person.role === 'Admin') return;
      const meta = capacityHint(person);
      options.push({
        key: `user:${person.userId}`,
        label: person.displayName || person.email || t('fieldWork.form.collaborator'),
        hint: meta.hint,
        group: meta.group,
      });
    });
    contacts.forEach((contact) => {
      if (contact.linkedUserId && people.some((person) => person.userId === contact.linkedUserId)) {
        return;
      }
      options.push({
        key: `contact:${contact.id}`,
        label: contact.displayName,
        hint: contact.phone || t('fieldWork.form.assigneeHintContact'),
        group: 'contact',
      });
    });
    options.push({
      key: 'later',
      label: t('fieldWork.form.decideLater'),
      group: 'later',
    });
    return options;
  }, [people, contacts, user?.userId, t]);

  const selectedField = fields.find((field) => field.id === fieldId);
  const initialTitle = proposal
    ? templateTitle(proposal.templateCode, i18n.language)
    : templateCodeParam
      ? templateTitle(templateCodeParam, i18n.language)
      : '';

  const goToPlanned = (createdId: string, year: number, nextFieldId: string) => {
    const params = buildTaskSearchParams({
      view: 'todo',
      year,
      defaultYear: year,
      fieldId: nextFieldId,
    });
    params.set('created', createdId);
    navigate(`/tasks?${params.toString()}`);
  };

  const handleSubmit = async (payload: ComposerPayload) => {
    setSaving(true);
    setError(null);
    try {
      const fw = getFieldWorkService();
      const primaryField = payload.fieldIds[0];
      if (!primaryField) throw new Error(t('fieldWork.form.needField'));
      if (mode === 'proposal' && proposal) {
        const accepted = await fw.acceptProposal(proposal.id, {
          plannedStart: payload.plannedStart,
          plannedEnd: payload.plannedEnd,
          assignedUserId: payload.assignedUserId,
          assignedCollaboratorId: payload.assignedCollaboratorId,
          notes: payload.notes,
        });
        const createdId = accepted.acceptedTaskId;
        if (!createdId) {
          throw new Error(t('fieldWork.form.failedSave'));
        }
        goToPlanned(createdId, proposal.resultYear, primaryField);
        return;
      }

      const workGroupId =
        payload.fieldIds.length > 1
          ? (globalThis.crypto?.randomUUID?.() ?? `group-${Date.now()}`)
          : undefined;
      let lastId = '';
      let year = new Date().getFullYear();
      for (const nextFieldId of payload.fieldIds) {
        const created = await fw.createFieldTask({
          fieldId: nextFieldId,
          title: payload.title,
          description: payload.description,
          templateCode: payload.templateCode,
          plannedStart: payload.plannedStart,
          plannedEnd: payload.plannedEnd,
          assignedUserId: payload.assignedUserId,
          assignedCollaboratorId: payload.assignedCollaboratorId,
          notes: payload.notes,
          estimatedCost: payload.estimatedCost,
          workGroupId,
        });
        lastId = created.id;
        year = created.resultYear || year;
      }
      goToPlanned(lastId, year, primaryField);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.form.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) {
    return (
      <PageContainer className="tasks-page-container">
        <Breadcrumbs />
        <LoadingSpinner />
      </PageContainer>
    );
  }

  const subtitle =
    mode === 'proposal'
      ? t('fieldWork.form.manualSubtitle')
      : templateCodeParam
        ? [initialTitle, selectedField?.name].filter(Boolean).join(' · ') ||
          t('fieldWork.form.manualSubtitle')
        : t('fieldWork.form.manualSubtitle');

  const proposalSummary =
    mode === 'proposal' && initialTitle
      ? t('fieldWork.form.fromSuggestion', {
          title: initialTitle,
          field: selectedField?.name ? ` · ${selectedField.name}` : '',
        })
      : null;

  return (
    <PageContainer className="tasks-page-container">
      <Breadcrumbs />
      <div className="task-form-page">
        <header className="task-form-header">
          <BackLink to="/tasks">{t('common:back')}</BackLink>
          <h1>
            {mode === 'proposal' ? t('fieldWork.form.scheduleTitle') : t('fieldWork.form.newTitle')}
          </h1>
          {proposalSummary ? (
            <p className="task-form-proposal-summary">
              <strong>{proposalSummary}</strong>
            </p>
          ) : (
            <p className="task-form-subtitle">{subtitle}</p>
          )}
        </header>

        <TaskComposer
          key={`${mode}-${proposal?.id || 'manual'}-${suggestedAssigneeKey}-${fieldId}-${templateCodeParam}`}
          mode={mode}
          fields={fields}
          proposal={proposal}
          assigneeOptions={assigneeOptions}
          initialFieldId={fieldId}
          initialAssigneeKey={suggestedAssigneeKey}
          initialTemplateCode={templateCodeParam}
          saving={saving}
          error={error}
          onFieldChange={setFieldId}
          onCancel={() => navigate('/tasks')}
          onSubmit={(payload) => void handleSubmit(payload)}
        />
      </div>
    </PageContainer>
  );
};

export default TaskFormPage;

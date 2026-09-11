import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getFieldService, getFieldWorkService, getPartnerService } from '../services/serviceFactory';
import { fieldPeopleService, type FieldMembership } from '../services/fieldPeopleService';
import { weatherService } from '../services/weatherService';
import type { SavedContact } from '../services/partnerService';
import type { Field } from '../services/fieldService';
import type { TaskProposal } from '../services/fieldWorkService';
import type { FieldWeather } from '../services/geospatialService';
import { getApiErrorMessage } from '../utils/translateApiError';
import { templateTitle } from '../data/fieldWorkCatalogueLabels';
import { readStashedProposal, toDateInputValue } from '../utils/proposalPresentation';
import { typeFromTemplate } from '../utils/taskFormTypes';
import { buildTaskSearchParams } from '../utils/taskViewState';
import {
  assigneeOptionKey,
  suggestAssigneeFromProfile,
} from '../utils/fieldWorkLearning';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import TaskForm, { type TaskFormSubmitPayload } from '../components/Tasks/form/TaskForm';
import type { AssigneeOption } from '../components/Tasks/form/AssigneeSelector';
import '../components/Tasks/form/TaskForm.css';

const TaskFormPage: React.FC = () => {
  const { t, i18n } = useTranslation(['tasks', 'common', 'errors']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fieldIdParam = searchParams.get('fieldId') || '';
  const proposalIdParam = searchParams.get('proposalId') || '';

  const stashed = proposalIdParam ? readStashedProposal() : null;
  const proposal: TaskProposal | null =
    stashed && stashed.id === proposalIdParam ? stashed : null;
  const mode = proposal ? 'proposal' : 'manual';

  const [fields, setFields] = useState<Field[]>([]);
  const [people, setPeople] = useState<FieldMembership[]>([]);
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [weather, setWeather] = useState<FieldWeather | null>(null);
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
      setWeather(null);
      setSuggestedAssigneeKey(meKey);
      return;
    }
    let cancelled = false;
    (async () => {
      const [memberships, saved, fieldWeather, workProfile] = await Promise.all([
        Promise.resolve(fieldPeopleService.getPeople(fieldId)).catch(() => [] as FieldMembership[]),
        Promise.resolve(
          getPartnerService().getContacts({ fieldId, includeUnassigned: true })
        ).catch(() => [] as SavedContact[]),
        Promise.resolve(weatherService.getFieldWeather(fieldId)).catch(() => null),
        Promise.resolve(getFieldWorkService().getWorkProfile?.(fieldId)).catch(() => null),
      ]);
      if (cancelled) return;
      setPeople(Array.isArray(memberships) ? memberships : []);
      setContacts(Array.isArray(saved) ? saved : []);
      setWeather(fieldWeather);
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

  const capacityHint = (capacities: FieldMembership['capacities']): { group: AssigneeOption['group']; hint: string } => {
    if (capacities.includes('work')) {
      return { group: 'partner', hint: t('fieldWork.form.assigneeHintPartner') };
    }
    if (capacities.includes('help')) {
      return { group: 'family', hint: t('fieldWork.form.assigneeHintFamily') };
    }
    if (capacities.includes('advise')) {
      return { group: 'partner', hint: t('fieldWork.form.assigneeHintAdvisor') };
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
      const meta = capacityHint(person.capacities || []);
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
    : '';

  const goToPlanned = (createdId: string, year: number, nextFieldId: string) => {
    const params = buildTaskSearchParams({
      view: 'planned',
      year,
      defaultYear: year,
      fieldId: nextFieldId,
    });
    params.set('created', createdId);
    navigate(`/tasks?${params.toString()}`);
  };

  const handleSubmit = async (payload: TaskFormSubmitPayload) => {
    setSaving(true);
    setError(null);
    try {
      const fw = getFieldWorkService();
      if (mode === 'proposal' && proposal) {
        const accepted = await fw.acceptProposal(proposal.id, {
          plannedStart: payload.plannedStart,
          plannedEnd: payload.plannedEnd,
          assignedUserId: payload.assignedUserId,
          assignedCollaboratorId: payload.assignedCollaboratorId,
          notes: payload.notes,
          resultYear: payload.resultYear,
        });
        const createdId = accepted.acceptedTaskId;
        if (!createdId) {
          throw new Error(t('fieldWork.form.failedSave'));
        }
        goToPlanned(createdId, payload.resultYear, payload.fieldId);
        return;
      }

      const created = await fw.createFieldTask({
        fieldId: payload.fieldId,
        title: payload.title,
        templateCode: payload.templateCode,
        plannedStart: payload.plannedStart,
        plannedEnd: payload.plannedEnd,
        preferredTimeWindow: payload.preferredTimeWindow,
        assignedUserId: payload.assignedUserId,
        assignedCollaboratorId: payload.assignedCollaboratorId,
        notes: payload.notes,
        estimatedCost: payload.estimatedCost,
        resultYear: payload.resultYear,
      });
      goToPlanned(created.id, created.resultYear || payload.resultYear, payload.fieldId);
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
      ? [initialTitle, selectedField?.name].filter(Boolean).join(' · ')
      : t('fieldWork.form.manualSubtitle');

  return (
    <PageContainer className="tasks-page-container">
      <Breadcrumbs />
      <div className="task-form-page">
        <header className="task-form-header">
          <h1>
            {mode === 'proposal' ? t('fieldWork.form.scheduleTitle') : t('fieldWork.form.newTitle')}
          </h1>
          <p className="task-form-subtitle">{subtitle}</p>
        </header>

        <TaskForm
          key={`${mode}-${proposal?.id || 'manual'}-${suggestedAssigneeKey}`}
          mode={mode}
          fields={fields}
          proposal={proposal}
          weather={weather}
          assigneeOptions={assigneeOptions}
          initialTitle={initialTitle}
          initialFieldId={fieldId}
          initialType={proposal ? typeFromTemplate(proposal.templateCode) : ''}
          initialStart={proposal ? toDateInputValue(proposal.recommendedWindowStart) : ''}
          initialEnd=""
          initialAssigneeKey={suggestedAssigneeKey}
          saving={saving}
          error={error}
          onFieldChange={setFieldId}
          onCancel={() => navigate('/tasks')}
          onSubmit={(payload) => {
            setFieldId(payload.fieldId);
            void handleSubmit(payload);
          }}
        />
      </div>
    </PageContainer>
  );
};

export default TaskFormPage;

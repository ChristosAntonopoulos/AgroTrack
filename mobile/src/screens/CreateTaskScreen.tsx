import React, { useEffect, useMemo, useLayoutEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getFieldService, getFieldWorkService, getPartnerService } from '../services/serviceFactory';
import { fieldPeopleService, type FieldMembership } from '../services/fieldPeopleService';
import { weatherService } from '../services/weatherService';
import type { SavedContact } from '../services/partnerService';
import type { Field } from '../services/fieldService';
import type { TaskProposal } from '../services/fieldWorkService';
import { templateTitle } from '../data/fieldWorkCatalogueLabels';
import { readStashedProposal, toDateInputValue } from '../utils/proposalPresentation';
import { typeFromTemplate } from '../utils/taskFormTypes';
import { assigneeOptionKey, suggestAssigneeFromProfile } from '../utils/fieldWorkLearning';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';
import TaskForm, { type AssigneeOption, type TaskFormSubmitPayload } from '../components/tasks/TaskForm';
import type { FieldWeather } from '../services/geospatialService';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'CreateTask'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateTask'>;

const CreateTaskScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation(['tasks', 'common']);
  const fieldIdParam = route.params?.fieldId || '';
  const proposalIdParam = route.params?.proposalId || '';
  const scheduledStart = route.params?.scheduledStart
    ? toDateInputValue(route.params.scheduledStart)
    : '';

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
    () => (user?.id ? `user:${user.id}` : 'later')
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: mode === 'proposal' ? t('fieldWork.form.scheduleTitle') : t('fieldWork.form.newTitle'),
      headerLeft: () => (
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ paddingHorizontal: 8 }}>
          <Text style={{ color: colors.primary, fontSize: 17 }}>{t('common:cancel')}</Text>
        </Pressable>
      ),
    });
  }, [navigation, colors.primary, t, mode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fieldsData = await getFieldService()
          .getFields(user?.id ?? '', user?.role ?? 'FieldOwner')
          .catch(() => [] as Field[]);
        if (cancelled) return;
        setFields(fieldsData);
        setFieldId((current) => current || fieldIdParam || proposal?.fieldId || fieldsData[0]?.id || '');
      } catch {
        if (!cancelled) setError(t('fieldWork.form.failedLoad'));
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fieldIdParam, proposal?.fieldId, t, user?.id, user?.role]);

  useEffect(() => {
    const meKey = user?.id ? `user:${user.id}` : 'later';
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
        fieldPeopleService.getPeople(fieldId).catch(() => [] as FieldMembership[]),
        getPartnerService()
          .getContacts({ fieldId, includeUnassigned: true })
          .catch(() => [] as SavedContact[]),
        weatherService.getFieldWeather(fieldId).catch(() => null),
        getFieldWorkService().getWorkProfile(fieldId).catch(() => null),
      ]);
      if (cancelled) return;
      setPeople(Array.isArray(memberships) ? memberships : []);
      setContacts(Array.isArray(saved) ? saved : []);
      setWeather(fieldWeather);
      if (mode === 'proposal' && proposal?.templateCode) {
        const suggestion = suggestAssigneeFromProfile(workProfile, proposal.templateCode, user?.id);
        setSuggestedAssigneeKey(assigneeOptionKey(suggestion, user?.id));
      } else {
        setSuggestedAssigneeKey(meKey);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fieldId, mode, proposal?.templateCode, user?.id]);

  const capacityHint = (
    capacities: FieldMembership['capacities']
  ): { group: AssigneeOption['group']; hint: string } => {
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
        key: user?.id ? `user:${user.id}` : 'later',
        label: t('fieldWork.form.assigneeMe'),
        group: 'self',
      },
    ];
    people.forEach((person) => {
      if (person.userId && person.userId === user?.id) return;
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
  }, [people, contacts, user?.id, t]);

  const selectedField = fields.find((field) => field.id === fieldId);
  const initialTitle = proposal ? templateTitle(proposal.templateCode, i18n.language) : '';

  const goToPlanned = (createdId: string, year: number, nextFieldId: string) => {
    navigation.navigate('Main', {
      screen: 'Tasks',
      params: {
        view: 'planned',
        year: String(year),
        fieldId: nextFieldId,
        created: createdId,
      },
    });
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
        if (!createdId) throw new Error(t('fieldWork.form.failedSave'));
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
      setError(err instanceof Error ? err.message : t('fieldWork.form.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) return <LoadingSpinner fullScreen />;

  const subtitle =
    mode === 'proposal'
      ? [initialTitle, selectedField?.name].filter(Boolean).join(' · ')
      : t('fieldWork.form.manualSubtitle');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {mode === 'proposal' ? t('fieldWork.form.scheduleTitle') : t('fieldWork.form.newTitle')}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
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
        initialStart={proposal ? toDateInputValue(proposal.recommendedWindowStart) : scheduledStart}
        initialEnd=""
        initialAssigneeKey={suggestedAssigneeKey}
        saving={saving}
        error={error}
        onFieldChange={setFieldId}
        onCancel={() => navigation.goBack()}
        onSubmit={(payload) => {
          setFieldId(payload.fieldId);
          void handleSubmit(payload);
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing['3xl'] },
  title: { ...typography.styles.h3, fontWeight: '700' },
  subtitle: { ...typography.styles.bodySmall, marginTop: 4, marginBottom: spacing.lg },
});

export default CreateTaskScreen;

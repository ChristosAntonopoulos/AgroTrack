import React, { useEffect, useMemo, useLayoutEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getFieldService, getFieldWorkService, getPartnerService } from '../services/serviceFactory';
import { fieldPeopleService, type FieldMembership } from '../services/fieldPeopleService';
import type { SavedContact } from '../services/partnerService';
import type { Field } from '../services/fieldService';
import type { TaskProposal } from '../services/fieldWorkService';
import { templateTitle } from '../data/fieldWorkCatalogueLabels';
import { readStashedProposal, toDateInputValue } from '../utils/proposalPresentation';
import { assigneeOptionKey, suggestAssigneeFromProfile } from '../utils/fieldWorkLearning';
import { getApiErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ScreenLayout from '../components/layout/ScreenLayout';
import TaskComposer, {
  type AssigneeOption,
  type ComposerPayload,
} from '../components/tasks/form/TaskComposer';
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
  const templateCodeParam = route.params?.templateCode || '';
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
          .getFields(user?.id ?? '', user?.role ?? 'FieldOwner', 'tasks')
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
      setSuggestedAssigneeKey(meKey);
      return;
    }
    let cancelled = false;
    (async () => {
      const [memberships, saved, workProfile] = await Promise.all([
        fieldPeopleService.getPeople(fieldId).catch(() => [] as FieldMembership[]),
        getPartnerService()
          .getContacts({ fieldId, includeUnassigned: true })
          .catch(() => [] as SavedContact[]),
        getFieldWorkService().getWorkProfile(fieldId).catch(() => null),
      ]);
      if (cancelled) return;
      setPeople(Array.isArray(memberships) ? memberships : []);
      setContacts(Array.isArray(saved) ? saved : []);
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
    person: FieldMembership
  ): { group: AssigneeOption['group']; hint: string } => {
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
        key: user?.id ? `user:${user.id}` : 'later',
        label: t('fieldWork.form.assigneeMe'),
        group: 'self',
      },
    ];
    people.forEach((person) => {
      if (person.userId && person.userId === user?.id) return;
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
  }, [people, contacts, user?.id, t]);

  const selectedField = fields.find((field) => field.id === fieldId);
  const initialTitle = proposal
    ? templateTitle(proposal.templateCode, i18n.language)
    : templateCodeParam
      ? templateTitle(templateCodeParam, i18n.language)
      : '';

  const goToPlanned = (createdId: string, year: number, nextFieldId: string) => {
    navigation.navigate('Main', {
      screen: 'Tasks',
      params: {
        view: 'todo',
        year: String(year),
        fieldId: nextFieldId,
        created: createdId,
      },
    });
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
        if (!createdId) throw new Error(t('fieldWork.form.failedSave'));
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
      setError(getApiErrorMessage(err, t('fieldWork.form.failedSave')));
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) return <LoadingSpinner fullScreen />;

  const proposalSummary =
    mode === 'proposal' && initialTitle
      ? t('fieldWork.form.fromSuggestion', {
          title: initialTitle,
          field: selectedField?.name ? ` · ${selectedField.name}` : '',
          defaultValue: `From suggestion · ${initialTitle}${selectedField?.name ? ` · ${selectedField.name}` : ''}`,
        })
      : null;

  const subtitle =
    mode === 'proposal'
      ? t('fieldWork.form.manualSubtitle')
      : templateCodeParam
        ? [initialTitle, selectedField?.name].filter(Boolean).join(' · ') ||
          t('fieldWork.form.manualSubtitle')
        : t('fieldWork.form.manualSubtitle');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScreenLayout scroll contentContainerStyle={styles.content}>
      {proposalSummary ? (
        <View style={[styles.summary, { backgroundColor: colors.primaryLight, borderColor: colors.oliveBorder }]}>
          <Text style={[styles.summaryText, { color: colors.textPrimary }]}>{proposalSummary}</Text>
        </View>
      ) : (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      )}
      <TaskComposer
        key={`${mode}-${proposal?.id || 'manual'}-${suggestedAssigneeKey}-${fieldId}-${templateCodeParam}`}
        mode={mode}
        fields={fields}
        proposal={proposal}
        assigneeOptions={assigneeOptions}
        initialFieldId={fieldId}
        initialAssigneeKey={suggestedAssigneeKey}
        initialTemplateCode={templateCodeParam}
        initialStart={scheduledStart}
        saving={saving}
        error={error}
        onFieldChange={setFieldId}
        onCancel={() => navigation.goBack()}
        onSubmit={(payload) => {
          setFieldId(payload.fieldIds[0] || fieldId);
          void handleSubmit(payload);
        }}
      />
    </ScreenLayout>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  content: { padding: spacing.base, paddingBottom: spacing['3xl'] },
  subtitle: { ...typography.styles.bodySmall, marginBottom: spacing.md },
  summary: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: spacing.md,
  },
  summaryText: { fontWeight: '700', lineHeight: 20 },
});

export default CreateTaskScreen;

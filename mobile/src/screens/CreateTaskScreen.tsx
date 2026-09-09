import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { addDays, format, parseISO, isValid } from 'date-fns';
import { getFieldService, getTaskService, getTaskTemplateService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { TaskTemplate } from '../services/taskTemplateService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { CREATE_HARVEST_JOBS, getHarvestJob } from '../utils/harvestJobs';
import FormField from '../components/forms/FormField';
import FormDateField from '../components/forms/FormDateField';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import InfoRow from '../components/ui/InfoRow';
import LoadingSpinner from '../components/LoadingSpinner';
import TaskWizardStepIndicator, { TaskWizardStep } from '../components/tasks/TaskWizardStepIndicator';
import { formatFieldArea } from '../utils/fieldGeo';
import { getFieldShortLocation } from '../utils/shortLocation';
import { getTaskCategoryColor } from '../utils/calendarCategoryColors';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'CreateTask'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateTask'>;

const ALL_STEPS: TaskWizardStep[] = ['field', 'template', 'details', 'review'];
const SKIP_FIELD_STEPS: TaskWizardStep[] = ['template', 'details', 'review'];
const EVERYDAY_STEPS: TaskWizardStep[] = ['field', 'template', 'details'];
const EVERYDAY_SKIP_FIELD: TaskWizardStep[] = ['template', 'details'];

const CUSTOM_TEMPLATE_ID = '__custom__';

const toDateInput = (date: Date) => format(date, 'yyyy-MM-dd');

const parseDateInput = (value: string): Date | null => {
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};

const CreateTaskScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const preselectedFieldId = route.params?.fieldId;
  const preselectedStart = route.params?.scheduledStart;
  const { user } = useAuth();
  const { colors } = useTheme();
  const { isEveryday, tapMin, fontScaleMultiplier } = usePreferences();
  const { t } = useTranslation(['tasks', 'common', 'fields']);

  const steps = useMemo(() => {
    if (isEveryday) return preselectedFieldId ? EVERYDAY_SKIP_FIELD : EVERYDAY_STEPS;
    return preselectedFieldId ? SKIP_FIELD_STEPS : ALL_STEPS;
  }, [preselectedFieldId, isEveryday]);

  const [step, setStep] = useState<TaskWizardStep>(steps[0]);
  const [fields, setFields] = useState<Field[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [fieldId, setFieldId] = useState(preselectedFieldId || '');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledStart, setScheduledStart] = useState(
    preselectedStart ? preselectedStart.slice(0, 10) : toDateInput(new Date())
  );
  const [scheduledEnd, setScheduledEnd] = useState(
    preselectedStart ? preselectedStart.slice(0, 10) : toDateInput(addDays(new Date(), 2))
  );
  const [fieldSearch, setFieldSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = steps.indexOf(step);
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex === steps.length - 1;

  const selectedField = fields.find((f) => f.id === fieldId) ?? null;
  const isCustom = templateId === CUSTOM_TEMPLATE_ID;

  const filteredFields = useMemo(() => {
    const q = fieldSearch.trim().toLowerCase();
    if (!q) return fields;
    return fields.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.locationText?.toLowerCase().includes(q) ?? false)
    );
  }, [fields, fieldSearch]);

  useEffect(() => {
    (async () => {
      try {
        const [fieldsData, templateData] = await Promise.all([
          getFieldService().getFields(user?.id ?? '', user?.role ?? 'FieldOwner'),
          getTaskTemplateService().getTemplates().catch(() => []),
        ]);
        setFields(fieldsData);
        setTemplates(templateData);
        if (!fieldId && fieldsData.length > 0) setFieldId(fieldsData[0].id);
      } catch {
        setError(t('tasks:loadError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [user, t]);

  const jobChoices = useMemo(() => {
    const byType = new Map<string, TaskTemplate>();
    templates.forEach((tpl) => {
      if (!byType.has(tpl.type)) byType.set(tpl.type, tpl);
    });
    CREATE_HARVEST_JOBS.forEach((type) => {
      if (byType.has(type)) return;
      const alias = templates.find((tpl) => getHarvestJob(tpl.type)?.aliasOf === type);
      if (alias) {
        byType.set(type, { ...alias, type, title: t(`tasks:harvestJobs.${type}.title`, { defaultValue: alias.title }) });
        return;
      }
      byType.set(type, {
        id: `local-${type}`,
        type,
        title: t(`tasks:harvestJobs.${type}.title`),
        description: t(`tasks:harvestJobs.${type}.helper`),
        lifecycleYear: 'high',
        harvestPhase: getHarvestJob(type)?.phase,
      });
    });
    const list = [...byType.values()];
    const month = new Date().getMonth() + 1;
    const harvestFirst = month >= 9 || month <= 1;
    list.sort((a, b) => {
      const ap = getHarvestJob(a.type) ? 0 : 1;
      const bp = getHarvestJob(b.type) ? 0 : 1;
      if (harvestFirst && ap !== bp) return ap - bp;
      return a.title.localeCompare(b.title);
    });
    return list;
  }, [templates, t]);

  const applyTemplate = useCallback((tpl: TaskTemplate) => {
    setTemplateId(tpl.id);
    setTitle(tpl.title);
    setType(tpl.type);
    setDescription(tpl.description || '');
  }, []);

  const applyCustomTemplate = useCallback(() => {
    setTemplateId(CUSTOM_TEMPLATE_ID);
    if (!title) setTitle('');
    if (!type) setType('');
  }, [title, type]);

  const applySchedulePreset = (preset: 'today' | 'threeDays' | 'week') => {
    const today = new Date();
    if (preset === 'today') {
      setScheduledStart(toDateInput(today));
      setScheduledEnd(toDateInput(today));
      return;
    }
    if (preset === 'threeDays') {
      setScheduledStart(toDateInput(today));
      setScheduledEnd(toDateInput(addDays(today, 2)));
      return;
    }
    setScheduledStart(toDateInput(today));
    setScheduledEnd(toDateInput(addDays(today, 6)));
  };

  const handleStartDateChange = (value: string) => {
    setScheduledStart(value);
    if (scheduledEnd && value > scheduledEnd) {
      setScheduledEnd(value);
    }
  };

  const endDateMinimum = parseDateInput(scheduledStart) ?? undefined;

  const validateStep = (): boolean => {
    setError(null);
    if (step === 'field') {
      if (!fieldId) {
        setError(t('tasks:createWizard.errors.fieldRequired'));
        return false;
      }
    }
    if (step === 'template') {
      if (!templateId) {
        setError(t('tasks:createWizard.errors.templateRequired'));
        return false;
      }
    }
    if (step === 'details') {
      if (!title.trim()) {
        setError(t('tasks:createWizard.errors.titleRequired'));
        return false;
      }
      if (!type.trim()) {
        setError(t('tasks:createWizard.errors.typeRequired'));
        return false;
      }
      const start = parseDateInput(scheduledStart);
      const end = parseDateInput(scheduledEnd);
      if (scheduledStart && !start) {
        setError(t('tasks:createWizard.errors.invalidStart'));
        return false;
      }
      if (scheduledEnd && !end) {
        setError(t('tasks:createWizard.errors.invalidEnd'));
        return false;
      }
      if (start && end && end < start) {
        setError(t('tasks:createWizard.errors.endBeforeStart'));
        return false;
      }
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    if (isLast) {
      void handleCreate();
      return;
    }
    setStep(steps[stepIndex + 1]);
  };

  const goBack = () => {
    setError(null);
    if (isFirst) {
      navigation.goBack();
      return;
    }
    setStep(steps[stepIndex - 1]);
  };

  const handleCreate = async () => {
    if (!fieldId || !title.trim() || !type.trim()) {
      setError(t('tasks:createWizard.errors.required'));
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await getTaskService().createTask({
        fieldId,
        templateId:
          templateId && templateId !== CUSTOM_TEMPLATE_ID && !templateId.startsWith('local-')
            ? templateId
            : undefined,
        title: title.trim(),
        type: type.trim(),
        description: description.trim() || undefined,
        harvestPhase: getHarvestJob(type)?.phase,
        lifecycleYear: selectedField?.currentLifecycleYear,
        scheduledStart: scheduledStart
          ? new Date(`${scheduledStart}T09:00:00`).toISOString()
          : undefined,
        scheduledEnd: scheduledEnd
          ? new Date(`${scheduledEnd}T17:00:00`).toISOString()
          : undefined,
      });
      navigation.goBack();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('tasks:loadError'));
    } finally {
      setSaving(false);
    }
  };

  const formatScheduleLabel = (dateStr: string) => {
    const d = parseDateInput(dateStr);
    if (!d) return dateStr;
    return format(d, 'd MMM yyyy', { locale: undefined });
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('tasks:createTask')}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('tasks:createWizard.subtitle')}
      </Text>

      <TaskWizardStepIndicator steps={steps} current={step} currentIndex={stepIndex} />

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.error + '18' }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : null}

      <Card variant="elevated" style={styles.panel}>
        {step === 'field' ? (
          <View style={styles.stepBody}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              {t('tasks:createWizard.fieldTitle')}
            </Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              {t('tasks:createWizard.fieldDesc')}
            </Text>
            {fields.length > 4 ? (
              <View
                style={[
                  styles.searchWrap,
                  { backgroundColor: colors.surface, borderColor: colors.borderLight },
                ]}
              >
                <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
                <TextInput
                  value={fieldSearch}
                  onChangeText={setFieldSearch}
                  placeholder={t('tasks:createWizard.searchFields')}
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                />
              </View>
            ) : null}
            {filteredFields.map((f) => {
              const active = f.id === fieldId;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFieldId(f.id)}
                  style={[
                    styles.fieldCard,
                    {
                      borderColor: active ? colors.primaryDark : colors.borderLight,
                      backgroundColor: active ? colors.primaryDark + '10' : colors.surface,
                      minHeight: isEveryday ? tapMin + 8 : undefined,
                    },
                  ]}
                >
                  <View style={styles.fieldCardMain}>
                    <Text style={[styles.fieldName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {f.name}
                    </Text>
                    {getFieldShortLocation(f) ? (
                      <Text style={[styles.fieldMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                        {getFieldShortLocation(f)}
                      </Text>
                    ) : null}
                    <Text style={[styles.fieldMeta, { color: colors.textTertiary }]}>
                      {formatFieldArea(f)}
                    </Text>
                  </View>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primaryDark} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {step === 'template' ? (
          <View style={styles.stepBody}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              {t('tasks:createWizard.templateTitle')}
            </Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              {t('tasks:createWizard.templateDesc')}
            </Text>
            {selectedField ? (
              <View style={[styles.contextChip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <Ionicons name="leaf-outline" size={14} color={colors.primaryDark} />
                <Text style={[styles.contextChipText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {selectedField.name}
                </Text>
              </View>
            ) : null}
            {jobChoices.map((tpl) => {
              const active = templateId === tpl.id || (templateId == null && type === tpl.type);
              const harvest = getHarvestJob(tpl.type);
              const tint = harvest ? colors.primaryDark : getTaskCategoryColor(tpl.type);
              return (
                <Pressable
                  key={tpl.id}
                  onPress={() => applyTemplate(tpl)}
                  style={[
                    styles.templateCard,
                    {
                      borderColor: active ? colors.primaryDark : colors.borderLight,
                      backgroundColor: active ? colors.primaryDark + '08' : colors.surface,
                      minHeight: isEveryday ? tapMin + 8 : undefined,
                    },
                  ]}
                >
                  {harvest ? (
                    <View style={[styles.typePill, { backgroundColor: tint + '22' }]}>
                      <Text style={[styles.typePillText, { color: tint }]}>
                        {t('tasks:harvest.word')} · {t(`tasks:harvest.phases.${harvest.phase}`)}
                      </Text>
                    </View>
                  ) : !isEveryday ? (
                    <View style={[styles.typePill, { backgroundColor: tint + '22' }]}>
                      <Text style={[styles.typePillText, { color: tint }]}>{tpl.type}</Text>
                    </View>
                  ) : null}
                  <Text
                    style={[
                      styles.templateTitle,
                      { color: colors.textPrimary, fontSize: isEveryday ? 17 * fontScaleMultiplier : undefined },
                    ]}
                  >
                    {harvest ? t(`tasks:harvestJobs.${harvest.aliasOf ?? harvest.type}.title`, { defaultValue: tpl.title }) : tpl.title}
                  </Text>
                  {tpl.description && !isEveryday ? (
                    <Text style={[styles.templateDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {tpl.description}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
            <Pressable
              onPress={applyCustomTemplate}
              style={[
                styles.templateCard,
                styles.customCard,
                {
                  borderColor: isCustom ? colors.primaryDark : colors.borderLight,
                  backgroundColor: isCustom ? colors.primaryDark + '08' : colors.surface,
                },
              ]}
            >
              <Ionicons name="create-outline" size={20} color={colors.primaryDark} />
              <View style={styles.customCardText}>
                <Text style={[styles.templateTitle, { color: colors.textPrimary }]}>
                  {t('tasks:createWizard.customTask')}
                </Text>
                <Text style={[styles.templateDesc, { color: colors.textSecondary }]}>
                  {t('tasks:createWizard.customTaskDesc')}
                </Text>
              </View>
            </Pressable>
          </View>
        ) : null}

        {step === 'details' ? (
          <View style={styles.stepBody}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              {isEveryday ? t('tasks:createWizard.whenTitle') : t('tasks:createWizard.detailsTitle')}
            </Text>
            {!isEveryday || isCustom ? (
              <>
                <FormField
                  label={t('tasks:createWizard.taskTitle')}
                  value={title}
                  onChangeText={setTitle}
                  editable={!saving}
                  placeholder={t('tasks:createWizard.taskTitlePlaceholder')}
                />
                <FormField
                  label={t('tasks:type')}
                  value={type}
                  onChangeText={setType}
                  editable={!saving}
                  placeholder={t('tasks:createWizard.typePlaceholder')}
                />
              </>
            ) : null}
            {!isEveryday ? (
              <FormField
                label={t('tasks:notes')}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                editable={!saving}
                placeholder={t('tasks:createWizard.notesPlaceholder')}
              />
            ) : null}
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
              {t('tasks:createWizard.scheduleTitle')}
            </Text>
            <View style={styles.presetRow}>
              {(['today', 'threeDays', 'week'] as const).map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => applySchedulePreset(preset)}
                  style={[
                    styles.presetChip,
                    {
                      borderColor: colors.borderLight,
                      backgroundColor: colors.surface,
                      minHeight: isEveryday ? tapMin : undefined,
                      justifyContent: 'center',
                    },
                  ]}
                >
                  <Text style={[styles.presetText, { color: colors.textSecondary }]}>
                    {t(`tasks:createWizard.presets.${preset}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <FormDateField
              label={t('tasks:createWizard.startDate')}
              value={scheduledStart}
              onValueChange={handleStartDateChange}
              disabled={saving}
            />
            <FormDateField
              label={t('tasks:createWizard.endDate')}
              value={scheduledEnd}
              onValueChange={setScheduledEnd}
              minimumDate={endDateMinimum}
              disabled={saving}
            />
          </View>
        ) : null}

        {step === 'review' ? (
          <View style={styles.stepBody}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              {t('tasks:createWizard.reviewTitle')}
            </Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              {t('tasks:createWizard.reviewDesc')}
            </Text>
            <InfoRow icon="leaf-outline" label={t('tasks:field')} value={selectedField?.name ?? '—'} />
            <InfoRow icon="clipboard-outline" label={t('tasks:type')} value={type || '—'} />
            <InfoRow icon="text-outline" label={t('tasks:createWizard.taskTitle')} value={title || '—'} />
            {description ? (
              <InfoRow icon="document-text-outline" label={t('tasks:notes')} value={description} />
            ) : null}
            <InfoRow
              icon="calendar-outline"
              label={t('tasks:scheduled')}
              value={
                scheduledStart
                  ? `${formatScheduleLabel(scheduledStart)}${
                      scheduledEnd && scheduledEnd !== scheduledStart
                        ? ` → ${formatScheduleLabel(scheduledEnd)}`
                        : ''
                    }`
                  : t('tasks:notScheduled')
              }
            />
          </View>
        ) : null}

        <View style={styles.navRow}>
          <Button
            title={isFirst ? t('common:cancel') : t('common:back')}
            variant="outline"
            onPress={goBack}
            disabled={saving}
            style={styles.navBtn}
          />
          <Button
            title={isLast ? t('tasks:createTask') : t('common:next')}
            onPress={goNext}
            loading={saving && isLast}
            style={styles.navBtn}
          />
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing['3xl'] },
  title: { ...typography.styles.h3, fontWeight: '700' },
  subtitle: { ...typography.styles.bodySmall, marginTop: 4, marginBottom: spacing.sm },
  panel: { padding: spacing.base },
  stepBody: { gap: spacing.xs, marginBottom: spacing.md },
  stepTitle: { ...typography.styles.h4, fontWeight: '700', marginBottom: 2 },
  stepDesc: { ...typography.styles.bodySmall, marginBottom: spacing.sm },
  sectionLabel: {
    ...typography.styles.bodySmall,
    fontWeight: '600',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  errorBox: { borderRadius: 10, padding: spacing.sm, marginBottom: spacing.sm },
  errorText: { ...typography.styles.bodySmall },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, ...typography.styles.body, padding: 0 },
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  fieldCardMain: { flex: 1, minWidth: 0 },
  fieldName: { ...typography.styles.body, fontWeight: '600' },
  fieldMeta: { ...typography.styles.caption, marginTop: 2 },
  contextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  contextChipText: { ...typography.styles.caption, fontWeight: '500', maxWidth: 240 },
  templateCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  customCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  customCardText: { flex: 1 },
  typePill: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.xs,
  },
  typePillText: { ...typography.styles.caption, fontWeight: '700', fontSize: 10 },
  templateTitle: { ...typography.styles.body, fontWeight: '600' },
  templateDesc: { ...typography.styles.bodySmall, marginTop: 4 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  presetChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  presetText: { ...typography.styles.caption, fontWeight: '600' },
  navRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  navBtn: { flex: 1 },
});

export default CreateTaskScreen;

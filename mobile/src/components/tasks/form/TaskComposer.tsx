import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { Field } from '../../../services/fieldService';
import type { TaskProposal } from '../../../services/fieldWorkService';
import { templateTitle } from '../../../data/fieldWorkCatalogueLabels';
import { TASK_FORM_TYPES, templateFromType, typeFromTemplate, type TaskFormTypeId } from '../../../utils/taskFormTypes';
import {
  addDaysToIso,
  athensTodayIso,
  toEndIso,
  toStartIso,
  weekSundayIso,
} from '../../../utils/taskFormDates';
import { formatTaskDateRange } from '../../../utils/taskDateRange';
import { friendlyFieldLabel } from '../../../utils/fieldLabels';
import { resolveFieldColor } from '../../../utils/fieldColors';
import { useTheme } from '../../../context/ThemeContext';
import { radii, spacing, typography } from '../../../theme';
import Button from '../../ui/Button';
import { TaskHelpText } from '../TaskChoiceChips';
import TaskDateSelector, { type DatePreset } from './TaskDateSelector';
import AssigneeSelector, { type AssigneeOption } from './AssigneeSelector';

const KIND_ICON: Record<TaskFormTypeId, React.ComponentProps<typeof Ionicons>['name']> = {
  irrigation: 'water-outline',
  fly: 'bug-outline',
  fertilisation: 'leaf-outline',
  pruning: 'cut-outline',
  weeds: 'nutrition-outline',
  harvest: 'basket-outline',
  other: 'create-outline',
};

export type ComposerPayload = {
  fieldIds: string[];
  title: string;
  templateCode?: string;
  plannedStart?: string;
  plannedEnd?: string;
  assignedUserId?: string;
  assignedCollaboratorId?: string;
  notes?: string;
  estimatedCost?: number;
  description?: string;
};

type TaskStep = 'what' | 'where' | 'when' | 'who';

const futureOrToday = (iso?: string): string => {
  const today = athensTodayIso();
  const day = iso?.slice(0, 10) || '';
  if (day && day >= today) return day;
  return today;
};

const TaskComposer = ({
  mode,
  fields,
  proposal,
  assigneeOptions,
  initialFieldId,
  initialAssigneeKey,
  initialTemplateCode = '',
  initialStart = '',
  saving,
  error,
  onFieldChange,
  onCancel,
  onSubmit,
}: {
  mode: 'manual' | 'proposal';
  fields: Field[];
  proposal?: TaskProposal | null;
  assigneeOptions: AssigneeOption[];
  initialFieldId: string;
  initialAssigneeKey: string;
  initialTemplateCode?: string;
  initialStart?: string;
  saving: boolean;
  error: string | null;
  onFieldChange?: (fieldId: string) => void;
  onCancel: () => void;
  onSubmit: (payload: ComposerPayload) => void;
}) => {
  const { t, i18n } = useTranslation('tasks');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const today = athensTodayIso();
  const seededTemplate = initialTemplateCode.trim();
  const proposalStart = futureOrToday(proposal?.recommendedWindowStart);
  const [typeId, setTypeId] = useState<TaskFormTypeId | ''>(
    seededTemplate ? typeFromTemplate(seededTemplate) || 'other' : ''
  );
  const [title, setTitle] = useState(
    mode === 'proposal' && proposal
      ? templateTitle(proposal.templateCode, i18n.language)
      : seededTemplate
        ? templateTitle(seededTemplate, i18n.language)
        : ''
  );
  const [fieldIds, setFieldIds] = useState<string[]>(initialFieldId ? [initialFieldId] : []);
  const [several, setSeveral] = useState(false);
  const [preset, setPreset] = useState<DatePreset | ''>(
    mode === 'proposal' || initialStart ? 'pick' : 'today'
  );
  const [start, setStart] = useState(
    mode === 'proposal' ? proposalStart : initialStart || today
  );
  const [end, setEnd] = useState('');
  const [multiDay, setMultiDay] = useState(false);
  const [assigneeKey, setAssigneeKey] = useState(initialAssigneeKey);
  const steps = useMemo<TaskStep[]>(
    () =>
      mode === 'proposal'
        ? initialFieldId
          ? ['when', 'who']
          : ['where', 'when', 'who']
        : seededTemplate
          ? ['where', 'when', 'who']
          : ['what', 'where', 'when', 'who'],
    [initialFieldId, mode, seededTemplate]
  );
  const [step, setStep] = useState<TaskStep>(steps[0]);
  const [more, setMore] = useState(false);
  const [notes, setNotes] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');

  const templateCode =
    mode === 'proposal'
      ? proposal?.templateCode
      : seededTemplate || templateFromType(typeId);

  const applyPreset = (next: DatePreset) => {
    const day = athensTodayIso();
    setPreset(next);
    if (next === 'today') {
      setStart(day);
      setEnd('');
      setMultiDay(false);
    } else if (next === 'tomorrow') {
      const tomorrow = addDaysToIso(day, 1);
      setStart(tomorrow);
      setEnd('');
      setMultiDay(false);
    } else if (next === 'thisWeek') {
      setStart(day);
      setEnd(weekSundayIso(day));
      setMultiDay(true);
    } else if (next === 'undecided') {
      setStart('');
      setEnd('');
      setMultiDay(false);
    } else if (next === 'pick' && !start) {
      setStart(day);
    }
  };

  const selectedFields = several ? fieldIds : fieldIds.slice(0, 1);
  const missingTitle = !title.trim();
  const missingField = selectedFields.length === 0;
  const missingDate = !preset || (preset === 'pick' && !start);
  const disabledReason = missingTitle
    ? t('fieldWork.form.needTitle')
    : missingField
      ? t('fieldWork.form.needField')
      : missingDate
        ? t('fieldWork.form.needDate')
        : '';

  const toggleField = (id: string) => {
    setFieldIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      onFieldChange?.(next[0] || '');
      return next;
    });
  };

  const submit = () => {
    if (disabledReason || saving) return;
    const selected = assigneeOptions.find((option) => option.key === assigneeKey);
    const plannedStart = preset === 'undecided' ? undefined : toStartIso(start);
    const plannedEnd = preset === 'undecided' || !multiDay ? undefined : toEndIso(end || start);
    const amount = cost.trim() ? Number(cost.replace(',', '.')) : undefined;
    onSubmit({
      fieldIds: selectedFields,
      title: title.trim(),
      templateCode,
      plannedStart,
      plannedEnd,
      assignedUserId: selected?.key.startsWith('user:') ? selected.key.slice(5) : undefined,
      assignedCollaboratorId: selected?.key.startsWith('contact:')
        ? selected.key.slice(8)
        : undefined,
      notes: notes.trim() || undefined,
      description: description.trim() || undefined,
      estimatedCost: amount != null && !Number.isNaN(amount) ? amount : undefined,
    });
  };

  const summaryField = several
    ? t('notebook.fieldCount', { n: selectedFields.length })
    : friendlyFieldLabel(fields.find((field) => field.id === selectedFields[0])?.name || '');

  const stepIndex = Math.max(0, steps.indexOf(step));
  const isLast = stepIndex === steps.length - 1;
  const goTo = (next: TaskStep) => setStep(next);
  const goNext = () => {
    const next = steps[stepIndex + 1];
    if (next) goTo(next);
  };
  const goBack = () => {
    const prev = steps[stepIndex - 1];
    if (prev) goTo(prev);
  };
  const stepReady =
    step === 'what'
      ? Boolean(title.trim())
      : step === 'where'
        ? selectedFields.length > 0
        : step === 'when'
          ? Boolean(preset) && (preset !== 'pick' || Boolean(start))
          : !disabledReason;

  const stepTitle =
    step === 'what'
      ? t('fieldWork.form.whatQuestion')
      : step === 'where'
        ? t('fieldWork.form.fieldQuestion')
        : step === 'when'
          ? t('fieldWork.form.whenQuestion')
          : t('fieldWork.form.whoQuestion');

  return (
    <View style={styles.form}>
      <View style={styles.stepBar}>
        {stepIndex > 0 ? (
          <Pressable onPress={goBack} hitSlop={8} accessibilityLabel={t('form.back')} style={styles.back}>
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        <View style={styles.dots}>
          {steps.map((id, index) => (
            <View
              key={id}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === stepIndex
                      ? colors.primary
                      : index < stepIndex
                        ? colors.oliveBorder
                        : colors.borderLight,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <Text
        style={[
          styles.stepTitle,
          { color: colors.textPrimary, fontSize: 30 * fontScaleMultiplier, lineHeight: 36 * fontScaleMultiplier },
        ]}
      >
        {stepTitle}
      </Text>

      {step === 'when' && mode === 'proposal' && proposal ? (
        <View style={[styles.why, { borderColor: colors.oliveBorder, backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.whyLabel, { color: colors.textSecondary }]}>
            {t('fieldWork.form.whyProposed')}
          </Text>
          <Text style={{ color: colors.textPrimary }}>
            {proposal.greekExplanation || proposal.explanation}
          </Text>
          {formatTaskDateRange(proposal.recommendedWindowStart, proposal.recommendedWindowEnd, i18n.language) ? (
            <TaskHelpText>
              {`${t('fieldWork.form.recommendedWindow')}: ${formatTaskDateRange(
                proposal.recommendedWindowStart,
                proposal.recommendedWindowEnd,
                i18n.language
              )}`}
            </TaskHelpText>
          ) : null}
        </View>
      ) : null}

      {step === 'what' ? (
        <>
          <Text style={[styles.section, { color: colors.textSecondary }]}>{t('notebook.frequent')}</Text>
          <View style={styles.kindList}>
            {TASK_FORM_TYPES.map((option) => {
              const selected = typeId === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    setTypeId(option.id);
                    if (option.id === 'other') return;
                    setTitle(t(option.labelKey));
                    goTo('where');
                  }}
                  style={[
                    styles.kindRow,
                    {
                      minHeight: Math.max(52, tapMin),
                      borderColor: selected ? colors.oliveBorder : 'transparent',
                      backgroundColor: selected ? colors.primaryLight : colors.surfaceMuted,
                    },
                  ]}
                >
                  <Ionicons name={KIND_ICON[option.id]} size={18} color={colors.primary} />
                  <Text style={{ flex: 1, color: colors.textPrimary, fontWeight: '600' }}>
                    {t(option.labelKey)}
                  </Text>
                  {selected ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('fieldWork.form.titlePlaceholder')}
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel={t('fieldWork.form.whatQuestion')}
            style={[
              styles.titleInput,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                fontSize: 16 * fontScaleMultiplier,
                minHeight: Math.max(56, tapMin),
              },
            ]}
          />
        </>
      ) : null}

      {step === 'where' ? (
        <>
          {fields.map((field) => {
            const checked = selectedFields.includes(field.id);
            const color = resolveFieldColor(field.color, field.id);
            return (
              <Pressable
                key={field.id}
                onPress={() => {
                  if (several) {
                    toggleField(field.id);
                    return;
                  }
                  setFieldIds([field.id]);
                  onFieldChange?.(field.id);
                  goTo('when');
                }}
                style={[
                  styles.fieldRow,
                  {
                    minHeight: Math.max(52, tapMin),
                    borderColor: checked ? colors.oliveBorder : 'transparent',
                    backgroundColor: checked ? colors.primaryLight : colors.surfaceMuted,
                  },
                ]}
              >
                <View style={[styles.swatch, { backgroundColor: color }]} />
                <Text style={{ flex: 1, color: colors.textPrimary, fontWeight: '700' }}>
                  {friendlyFieldLabel(field.name)}
                </Text>
                {checked ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
          {fields.length > 1 && mode === 'manual' ? (
            <Pressable onPress={() => setSeveral((value) => !value)} style={styles.link}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {several ? t('notebook.oneField') : t('notebook.severalFields')}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      {step === 'when' ? (
        <TaskDateSelector
          preset={preset}
          start={start}
          end={end}
          multiDay={multiDay}
          recommendedStart={proposal?.recommendedWindowStart}
          recommendedEnd={proposal?.recommendedWindowEnd}
          onPreset={applyPreset}
          onStartChange={(iso) => {
            setPreset('pick');
            setStart(iso);
          }}
          onEndChange={setEnd}
          onToggleMultiDay={() => {
            setMultiDay((value) => {
              const next = !value;
              if (next && start && !end) setEnd(start);
              if (!next) setEnd('');
              return next;
            });
          }}
        />
      ) : null}

      {step === 'who' ? (
        <>
          <AssigneeSelector options={assigneeOptions} value={assigneeKey} onChange={setAssigneeKey} />
          <Pressable onPress={() => setMore((value) => !value)} style={styles.link}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {more ? t('fieldWork.form.hideMore') : t('fieldWork.form.moreDetails')}
            </Text>
          </Pressable>
          {more ? (
            <View style={styles.more}>
              <Text style={[styles.section, { color: colors.textSecondary }]}>
                {t('fieldWork.form.notes')}
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                style={[
                  styles.notes,
                  { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
                ]}
              />
              <Text style={[styles.section, { color: colors.textSecondary }]}>
                {t('detail.description')}
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                style={[
                  styles.notes,
                  { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
                ]}
              />
              <Text style={[styles.section, { color: colors.textSecondary }]}>
                {t('fieldWork.form.estimatedCost')}
              </Text>
              <View style={styles.costRow}>
                <TextInput
                  value={cost}
                  onChangeText={setCost}
                  keyboardType="decimal-pad"
                  accessibilityLabel={t('fieldWork.form.estimatedCost')}
                  style={[
                    styles.input,
                    { flex: 1, color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
                  ]}
                />
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>€</Text>
              </View>
              <TaskHelpText>{t('fieldWork.form.costHint')}</TaskHelpText>
            </View>
          ) : null}
        </>
      ) : null}

      {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}

      {isLast && title.trim() ? (
        <Text style={{ color: colors.textSecondary }}>
          <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{title.trim()}</Text>
          {summaryField ? ` · ${summaryField}` : ''}
        </Text>
      ) : null}

      {isLast ? (
        <Button
          title={mode === 'proposal' ? t('fieldWork.form.scheduleSubmit') : t('fieldWork.form.createSubmit')}
          onPress={submit}
          disabled={!stepReady || saving}
          loading={saving}
          fullWidth
          size="large"
        />
      ) : (
        <Button title={t('form.next')} onPress={goNext} disabled={!stepReady} fullWidth size="large" />
      )}
      <Button
        title={t('fieldWork.form.cancel')}
        variant="outline"
        onPress={onCancel}
        disabled={saving}
        fullWidth
      />
    </View>
  );
};

const styles = StyleSheet.create({
  form: { gap: spacing.md, paddingBottom: spacing['3xl'] },
  stepBar: { flexDirection: 'row', alignItems: 'center', minHeight: 28 },
  back: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  stepTitle: { fontWeight: '800', letterSpacing: -0.4 },
  section: { ...typography.styles.caption, fontWeight: '700', textTransform: 'uppercase' },
  kindList: { gap: spacing.xs },
  kindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  link: { paddingVertical: spacing.sm },
  why: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.base, gap: spacing.xs },
  whyLabel: { ...typography.styles.caption, fontWeight: '700' },
  more: { gap: spacing.sm },
  notes: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: { borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, minHeight: 48 },
});

export default TaskComposer;
export type { AssigneeOption };

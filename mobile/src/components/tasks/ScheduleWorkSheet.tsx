import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import FormDateField from '../forms/FormDateField';
import FieldColorMark from '../fields/FieldColorMark';
import type { Field } from '../../services/fieldService';
import type { CreateTaskInput, TaskSuggestion } from '../../services/taskService';
import type { AssigneeOption } from './form/AssigneeSelector';
import AssigneeSelector from './form/AssigneeSelector';
import TemplatePicker, { type TemplatePickerSelection } from './TemplatePicker';
import { TaskChoiceChips } from './TaskChoiceChips';
import TaskCategoryGlyph from './TaskCategoryGlyph';
import { resolveTaskCategoryAccent } from '../../utils/taskCategoryAccents';
import {
  getMinimalTemplate,
  minimalTemplateChecklistLines,
  minimalTemplateDescription,
  minimalTemplateTitle,
} from '../../data/minimalTaskTemplates';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing, typography } from '../../theme';

export type RecurrenceChip = 'once' | 'weekly' | 'monthly';
type FormStep = 'what' | 'field' | 'who' | 'ready';

export type ScheduleWorkPrefill = {
  fieldId?: string;
  title?: string;
  templateCode?: string;
  note?: string;
  description?: string;
};

type Props = {
  open: boolean;
  fields: Field[];
  assigneeOptions: AssigneeOption[];
  suggestions?: TaskSuggestion[];
  prefill?: ScheduleWorkPrefill | null;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (input: CreateTaskInput) => void | Promise<void>;
};

const FORM_STEPS: FormStep[] = ['what', 'field', 'who', 'ready'];

const RECURRENCE_CHIPS: Array<{ id: RecurrenceChip; labelKey: string }> = [
  { id: 'once', labelKey: 'schedule.repeatOnce' },
  { id: 'weekly', labelKey: 'schedule.repeatWeekly' },
  { id: 'monthly', labelKey: 'schedule.repeatMonthly' },
];

const newIdempotencyKey = () =>
  `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const ScheduleWorkSheet: React.FC<Props> = ({
  open,
  fields,
  assigneeOptions,
  suggestions = [],
  prefill,
  busy,
  error,
  onClose,
  onSubmit,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const [pickingTemplate, setPickingTemplate] = useState(false);
  const [step, setStep] = useState<FormStep>('what');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateCode, setTemplateCode] = useState<string | undefined>();
  const [fieldId, setFieldId] = useState('');
  const [assigneeKey, setAssigneeKey] = useState('later');
  const [note, setNote] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceChip>('once');
  const [repeatStart, setRepeatStart] = useState('');
  const [checklistText, setChecklistText] = useState('');
  const idempotencyKeyRef = useRef(newIdempotencyKey());

  const selfKey = useMemo(
    () => assigneeOptions.find((option) => option.group === 'self')?.key || 'later',
    [assigneeOptions]
  );

  const usableFields = useMemo(
    () => fields.filter((field) => (field.status || 'Active') !== 'Draft'),
    [fields]
  );

  const selectedField = usableFields.find((field) => field.id === fieldId);
  const selectedAssignee = assigneeOptions.find((option) => option.key === assigneeKey);

  useEffect(() => {
    if (!open) return;
    idempotencyKeyRef.current = newIdempotencyKey();
    const nextField = prefill?.fieldId || usableFields[0]?.id || fields[0]?.id || '';
    setFieldId(nextField);
    const code = prefill?.templateCode;
    const meta = getMinimalTemplate(code);
    setTemplateCode(code);
    setTitle(prefill?.title || (code ? minimalTemplateTitle(code, i18n.language) : ''));
    setDescription(
      prefill?.description ||
        (code
          ? meta?.description[i18n.language.startsWith('en') ? 'en' : 'el'] ||
            minimalTemplateDescription(code, i18n.language)
          : '')
    );
    setChecklistText(code ? minimalTemplateChecklistLines(code, i18n.language).join('\n') : '');
    setAssigneeKey(selfKey);
    setNote(prefill?.note || '');
    setRecurrence('once');
    setRepeatStart('');
    setStep('what');
    setPickingTemplate(!prefill?.title && !prefill?.templateCode);
  }, [open, prefill, fields, usableFields, selfKey, i18n.language]);

  const stepIndex = FORM_STEPS.indexOf(step);
  const titleMissing = !title.trim();
  const fieldMissing = !fieldId;
  const recurrenceNeedsDate = recurrence !== 'once' && !repeatStart;
  const canContinue =
    step === 'what'
      ? Boolean(title.trim())
      : step === 'field'
        ? Boolean(fieldId)
        : step === 'who'
          ? true
          : Boolean(title.trim() && fieldId && !busy && !recurrenceNeedsDate);

  const goTo = (next: FormStep) => setStep(next);

  const goNext = () => {
    if (!canContinue) return;
    const next = FORM_STEPS[stepIndex + 1];
    if (next) goTo(next);
  };

  const goBack = () => {
    if (stepIndex <= 0) {
      setPickingTemplate(true);
      return;
    }
    goTo(FORM_STEPS[stepIndex - 1]);
  };

  const applyTemplate = (selection: TemplatePickerSelection) => {
    if (selection.kind === 'custom') {
      setTemplateCode(undefined);
      setTitle('');
      setDescription('');
      setChecklistText('');
    } else {
      setTemplateCode(selection.templateCode);
      setTitle(selection.title);
      setDescription(selection.description);
      setChecklistText(selection.checklistLines.join('\n'));
    }
    setStep('what');
    setPickingTemplate(false);
  };

  const parseAssignee = (
    key: string
  ): Pick<CreateTaskInput, 'assigneeId' | 'assignedUserId' | 'assignedCollaboratorId'> => {
    if (!key || key === 'later') return {};
    if (key.startsWith('user:')) {
      const id = key.slice(5);
      return { assigneeId: id, assignedUserId: id };
    }
    if (key.startsWith('contact:')) {
      const id = key.slice(8);
      return { assignedCollaboratorId: id };
    }
    return { assigneeId: key, assignedUserId: key };
  };

  const handleSubmit = () => {
    if (!canContinue || step !== 'ready') return;
    const checklist = checklistText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => ({ key: `c${index + 1}`, label: line }));

    const withRepeat = recurrence !== 'once' && repeatStart;

    void onSubmit({
      fieldId,
      title: title.trim(),
      description: description.trim() || undefined,
      templateCode,
      timingBucket: 'later',
      scheduledFor: withRepeat ? repeatStart : undefined,
      plannedStart: withRepeat ? repeatStart : undefined,
      note: note.trim() || undefined,
      notes: note.trim() || undefined,
      recurrence: withRepeat ? recurrence : undefined,
      checklist: checklist.length > 0 ? checklist : undefined,
      idempotencyKey: idempotencyKeyRef.current,
      ...parseAssignee(assigneeKey),
    });
  };

  const stepTitle =
    step === 'what'
      ? t('schedule.stepWhat')
      : step === 'field'
        ? t('schedule.stepField')
        : step === 'who'
          ? t('schedule.stepWho')
          : t('schedule.stepReady');

  return (
    <Sheet
      open={open}
      onClose={onClose}
      edge="bottom"
      size="lg"
      title={pickingTemplate ? t('schedule.templates.title') : t('schedule.title')}
      subtitle={pickingTemplate ? t('schedule.templates.subtitle') : t('schedule.formHint')}
      footer={
        pickingTemplate ? null : (
          <View style={styles.footer}>
            {step === 'ready' ? (
              <Button
                title={t('schedule.submit')}
                onPress={handleSubmit}
                disabled={!canContinue}
                loading={busy}
                style={{ flex: 1 }}
              />
            ) : (
              <Button
                title={t('schedule.continue')}
                onPress={goNext}
                disabled={!canContinue || busy}
                style={{ flex: 1 }}
              />
            )}
          </View>
        )
      }
    >
      {pickingTemplate ? (
        <TemplatePicker
          suggestions={suggestions}
          language={i18n.language}
          onSelect={applyTemplate}
          onCancel={() => {
            if (title.trim() || templateCode) {
              setPickingTemplate(false);
              setStep('what');
            } else onClose();
          }}
        />
      ) : (
        <View style={styles.form}>
          {error ? (
            <Text style={{ color: colors.error }} role="alert">
              {error}
            </Text>
          ) : null}

          <View style={styles.stepHead}>
            <Pressable onPress={goBack} hitSlop={8} accessibilityLabel={t('schedule.back')}>
              <Ionicons name="chevron-back" size={22} color={colors.primary} />
            </Pressable>
            <Text style={{ color: colors.textTertiary, fontWeight: '700', fontSize: 13 }}>
              {t('schedule.stepProgress', { current: stepIndex + 1, total: FORM_STEPS.length })}
            </Text>
            <View style={styles.dots} accessibilityElementsHidden>
              {FORM_STEPS.map((id, index) => (
                <View
                  key={id}
                  style={[
                    styles.dot,
                    index === stepIndex
                      ? { width: 18, backgroundColor: colors.primary }
                      : index < stepIndex
                        ? { backgroundColor: colors.textTertiary }
                        : { backgroundColor: colors.borderLight },
                  ]}
                />
              ))}
            </View>
          </View>

          <Text
            style={[
              styles.stepTitle,
              { color: colors.textPrimary, fontSize: 26 * fontScaleMultiplier },
            ]}
          >
            {stepTitle}
          </Text>

          {step === 'what' ? (
            <View style={styles.section}>
              <View
                style={[
                  styles.titleCard,
                  {
                    borderColor: colors.borderLight,
                    backgroundColor: colors.surfaceMuted,
                  },
                ]}
              >
                {templateCode ? (
                  <TaskCategoryGlyph
                    templateCode={templateCode}
                    accent={resolveTaskCategoryAccent(templateCode)}
                    size={40}
                  />
                ) : (
                  <View style={[styles.iconWell, { backgroundColor: colors.surface }]}>
                    <Ionicons name="create-outline" size={22} color={colors.primary} />
                  </View>
                )}
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('schedule.whatPlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                  style={[
                    styles.titleInput,
                    {
                      color: colors.textPrimary,
                      fontSize: 17 * fontScaleMultiplier,
                      minHeight: Math.max(48, tapMin * 0.95),
                    },
                  ]}
                  returnKeyType="next"
                  onSubmitEditing={goNext}
                />
                <Pressable
                  onPress={() => setPickingTemplate(true)}
                  accessibilityLabel={t('schedule.pickTemplate')}
                  style={[
                    styles.templateBtn,
                    {
                      minHeight: Math.max(44, tapMin * 0.9),
                      borderColor: colors.oliveBorder,
                      backgroundColor: colors.primaryLight,
                    },
                  ]}
                >
                  <Ionicons name="grid-outline" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                    {t('schedule.pickTemplate')}
                  </Text>
                </Pressable>
              </View>
              {titleMissing ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {t('schedule.needTitle')}
                </Text>
              ) : null}
              {description ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                  {description}
                </Text>
              ) : null}
            </View>
          ) : null}

          {step === 'field' ? (
            <View style={styles.section}>
              <TaskChoiceChips
                options={
                  usableFields.length === 0
                    ? [{ id: '', label: t('schedule.noFields') }]
                    : usableFields.map((field) => ({
                        id: field.id,
                        label: field.name,
                        leading: <FieldColorMark color={field.color} fieldId={field.id} size={10} />,
                      }))
                }
                value={fieldId}
                onChange={setFieldId}
              />
              {fieldMissing ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {t('schedule.needField')}
                </Text>
              ) : null}
            </View>
          ) : null}

          {step === 'who' ? (
            <View style={styles.section}>
              <AssigneeSelector
                options={assigneeOptions}
                value={assigneeKey}
                onChange={setAssigneeKey}
              />
            </View>
          ) : null}

          {step === 'ready' ? (
            <View style={styles.section}>
              <View
                style={[
                  styles.summary,
                  {
                    borderColor: colors.borderLight,
                    backgroundColor: colors.surfaceMuted,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontWeight: '700',
                    fontSize: 16 * fontScaleMultiplier,
                  }}
                >
                  {title.trim()}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {[selectedField?.name, selectedAssignee?.label || t('schedule.decideLater')]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>

              <Text style={[styles.softLabel, { color: colors.textSecondary }]}>
                {t('schedule.checklist')}
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                {t('schedule.checklistHint')}
              </Text>
              <TextInput
                value={checklistText}
                onChangeText={setChecklistText}
                placeholder={t('schedule.checklistPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                multiline
                style={[
                  styles.input,
                  styles.area,
                  {
                    color: colors.textPrimary,
                    borderColor: colors.borderLight,
                    backgroundColor: colors.surface,
                  },
                ]}
              />

              <Text style={[styles.softLabel, { color: colors.textSecondary }]}>
                {t('schedule.note')}
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t('schedule.notePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                multiline
                style={[
                  styles.input,
                  styles.area,
                  {
                    color: colors.textPrimary,
                    borderColor: colors.borderLight,
                    backgroundColor: colors.surface,
                  },
                ]}
              />

              <Text style={[styles.softLabel, { color: colors.textSecondary }]}>
                {t('schedule.repeat')}
              </Text>
              <TaskChoiceChips
                options={RECURRENCE_CHIPS.map((chip) => ({
                  id: chip.id,
                  label: t(chip.labelKey),
                }))}
                value={recurrence}
                onChange={setRecurrence}
              />
              {recurrence !== 'once' ? (
                <>
                  <FormDateField
                    label={t('schedule.repeatStart')}
                    value={repeatStart}
                    onValueChange={setRepeatStart}
                  />
                  {recurrenceNeedsDate ? (
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {t('schedule.repeatStartRequired')}
                    </Text>
                  ) : null}
                </>
              ) : null}
              <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
                {t('schedule.photoHint')}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  section: { gap: spacing.sm },
  stepHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  stepTitle: {
    ...typography.styles.h2,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  softLabel: { fontSize: 13, fontWeight: '700' },
  titleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.xl,
    padding: 10,
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    fontWeight: '600',
  },
  templateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
  },
  summary: {
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.xl,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  area: { minHeight: 88, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', gap: 8 },
});

export default ScheduleWorkSheet;

import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import FormDateField from '../forms/FormDateField';
import FieldColorMark from '../fields/FieldColorMark';
import type { Field } from '../../services/fieldService';
import type { CreateTaskInput, TaskSuggestion, TaskTimingBucket } from '../../services/taskService';
import type { AssigneeOption } from './form/AssigneeSelector';
import AssigneeSelector from './form/AssigneeSelector';
import TemplatePicker, { type TemplatePickerSelection } from './TemplatePicker';
import { TaskChoiceChips } from './TaskChoiceChips';
import TaskCategoryGlyph from './TaskCategoryGlyph';
import { resolveTaskCategoryAccent } from '../../utils/taskCategoryAccents';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing, typography } from '../../theme';

export type TimingChip = TaskTimingBucket | 'pickDate';
export type RecurrenceChip = 'once' | 'weekly' | 'monthly';

export type ScheduleWorkPrefill = {
  fieldId?: string;
  title?: string;
  templateCode?: string;
  timingBucket?: TaskTimingBucket;
  scheduledFor?: string;
  note?: string;
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

const TIMING_CHIPS: Array<{
  id: TimingChip;
  labelKey: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
  { id: 'today', labelKey: 'schedule.when.today', icon: 'sunny-outline' },
  { id: 'tomorrow', labelKey: 'schedule.when.tomorrow', icon: 'arrow-forward-outline' },
  { id: 'thisWeek', labelKey: 'schedule.when.thisWeek', icon: 'calendar-outline' },
  { id: 'pickDate', labelKey: 'schedule.when.otherDay', icon: 'calendar-number-outline' },
  { id: 'later', labelKey: 'schedule.when.sometime', icon: 'time-outline' },
];

const RECURRENCE_CHIPS: Array<{ id: RecurrenceChip; labelKey: string }> = [
  { id: 'once', labelKey: 'schedule.repeatOnce' },
  { id: 'weekly', labelKey: 'schedule.repeatWeekly' },
  { id: 'monthly', labelKey: 'schedule.repeatMonthly' },
];

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
  const [title, setTitle] = useState('');
  const [templateCode, setTemplateCode] = useState<string | undefined>();
  const [fieldId, setFieldId] = useState('');
  const [timing, setTiming] = useState<TimingChip>('today');
  const [scheduledFor, setScheduledFor] = useState('');
  const [assigneeKey, setAssigneeKey] = useState('later');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [note, setNote] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceChip>('once');
  const [checklistText, setChecklistText] = useState('');

  const selfKey = useMemo(
    () => assigneeOptions.find((option) => option.group === 'self')?.key || 'later',
    [assigneeOptions]
  );

  const usableFields = useMemo(
    () => fields.filter((field) => (field.status || 'Active') !== 'Draft'),
    [fields]
  );

  useEffect(() => {
    if (!open) return;
    const nextField = prefill?.fieldId || usableFields[0]?.id || fields[0]?.id || '';
    setFieldId(nextField);
    setTitle(prefill?.title || '');
    setTemplateCode(prefill?.templateCode);
    setTiming(prefill?.timingBucket || 'today');
    setScheduledFor(prefill?.scheduledFor || '');
    setAssigneeKey(selfKey);
    setNote(prefill?.note || '');
    setRecurrence('once');
    setChecklistText('');
    setDetailsOpen(false);
    setPickingTemplate(!prefill?.title && !prefill?.templateCode);
  }, [open, prefill, fields, usableFields, selfKey]);

  const canSubmit = Boolean(title.trim() && fieldId && !busy);

  const applyTemplate = (selection: TemplatePickerSelection) => {
    if (selection.kind === 'custom') {
      setTemplateCode(undefined);
      if (!title.trim()) setTitle('');
    } else {
      setTemplateCode(selection.templateCode);
      setTitle(selection.title);
    }
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
      return { assigneeId: id, assignedCollaboratorId: id };
    }
    return { assigneeId: key, assignedUserId: key };
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const timingBucket: TaskTimingBucket =
      timing === 'pickDate' ? 'later' : timing === 'later' ? 'later' : timing;
    const checklist = checklistText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => ({ key: `c${index + 1}`, textValue: line, isAnswered: false }));

    void onSubmit({
      fieldId,
      title: title.trim(),
      templateCode,
      timingBucket,
      scheduledFor: timing === 'pickDate' && scheduledFor ? scheduledFor : undefined,
      note: note.trim() || undefined,
      notes: note.trim() || undefined,
      recurrence: recurrence === 'once' ? undefined : recurrence,
      checklist: checklist.length > 0 ? checklist : undefined,
      ...parseAssignee(assigneeKey),
    });
  };

  const promptStyle = [
    styles.prompt,
    { color: colors.textPrimary, fontSize: 18 * fontScaleMultiplier },
  ];

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
            <Button
              title={t('schedule.cancel')}
              variant="outline"
              onPress={onClose}
              disabled={busy}
              style={{ flex: 1 }}
            />
            <Button
              title={t('schedule.submit')}
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={busy}
              style={{ flex: 1 }}
            />
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
            if (title.trim() || templateCode) setPickingTemplate(false);
            else onClose();
          }}
        />
      ) : (
        <View style={styles.form}>
          {error ? (
            <Text style={{ color: colors.error }} role="alert">
              {error}
            </Text>
          ) : null}

          <View style={styles.section}>
            <Text style={promptStyle}>{t('schedule.what')}</Text>
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
          </View>

          <View style={styles.section}>
            <Text style={promptStyle}>{t('schedule.field')}</Text>
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
          </View>

          <View style={styles.section}>
            <Text style={promptStyle}>{t('schedule.when.label')}</Text>
            <TaskChoiceChips
              options={TIMING_CHIPS.map((chip) => ({
                id: chip.id,
                label: t(chip.labelKey),
                icon: chip.icon,
              }))}
              value={timing}
              onChange={setTiming}
            />
            {timing === 'pickDate' ? (
              <FormDateField
                label={t('schedule.when.otherDay')}
                value={scheduledFor}
                onValueChange={setScheduledFor}
              />
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={promptStyle}>{t('schedule.who')}</Text>
            <AssigneeSelector
              options={assigneeOptions}
              value={assigneeKey}
              onChange={setAssigneeKey}
            />
          </View>

          <Pressable
            onPress={() => setDetailsOpen((openNow) => !openNow)}
            style={[styles.moreToggle, { minHeight: Math.max(44, tapMin * 0.88) }]}
            accessibilityRole="button"
            accessibilityState={{ expanded: detailsOpen }}
          >
            <Ionicons
              name={detailsOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.primary}
            />
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>
              {detailsOpen ? t('schedule.lessDetails') : t('schedule.moreDetails')}
            </Text>
          </Pressable>

          {detailsOpen ? (
            <View style={styles.more}>
              <View style={styles.section}>
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
              </View>
              <View style={styles.section}>
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
              </View>
              <View style={styles.section}>
                <Text style={[styles.softLabel, { color: colors.textSecondary }]}>
                  {t('schedule.checklist')}
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
              </View>
              <Text style={{ color: colors.textTertiary, fontSize: 13 }}>{t('schedule.photoHint')}</Text>
            </View>
          ) : null}
        </View>
      )}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  section: { gap: spacing.sm },
  prompt: {
    ...typography.styles.h3,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
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
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  area: { minHeight: 88, textAlignVertical: 'top' },
  moreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  more: { gap: spacing.md },
  footer: { flexDirection: 'row', gap: 8 },
});

export default ScheduleWorkSheet;

import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import FormDateField from '../forms/FormDateField';
import type { Field } from '../../services/fieldService';
import type { CreateTaskInput, TaskSuggestion, TaskTimingBucket } from '../../services/taskService';
import type { AssigneeOption } from './form/AssigneeSelector';
import AssigneeSelector from './form/AssigneeSelector';
import TemplatePicker, { type TemplatePickerSelection } from './TemplatePicker';
import { TaskChoiceChips } from './TaskChoiceChips';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme';

export type TimingChip = TaskTimingBucket | 'pickDate';

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

const TIMING_CHIPS: Array<{ id: TimingChip; labelKey: string }> = [
  { id: 'today', labelKey: 'schedule.when.today' },
  { id: 'tomorrow', labelKey: 'schedule.when.tomorrow' },
  { id: 'thisWeek', labelKey: 'schedule.when.thisWeek' },
  { id: 'pickDate', labelKey: 'schedule.when.otherDay' },
  { id: 'later', labelKey: 'schedule.when.sometime' },
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
  const [recurrence, setRecurrence] = useState('');
  const [checklistText, setChecklistText] = useState('');

  const selfKey = useMemo(
    () => assigneeOptions.find((option) => option.group === 'self')?.key || 'later',
    [assigneeOptions]
  );

  useEffect(() => {
    if (!open) return;
    const nextField = prefill?.fieldId || fields[0]?.id || '';
    setFieldId(nextField);
    setTitle(prefill?.title || '');
    setTemplateCode(prefill?.templateCode);
    setTiming(prefill?.timingBucket || 'today');
    setScheduledFor(prefill?.scheduledFor || '');
    setAssigneeKey(selfKey);
    setNote(prefill?.note || '');
    setRecurrence('');
    setChecklistText('');
    setDetailsOpen(false);
    setPickingTemplate(!prefill?.title && !prefill?.templateCode);
  }, [open, prefill, fields, selfKey]);

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
      recurrence: recurrence.trim() || undefined,
      checklist: checklist.length > 0 ? checklist : undefined,
      ...parseAssignee(assigneeKey),
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      edge="bottom"
      size="lg"
      title={pickingTemplate ? t('schedule.templates.title') : t('schedule.title')}
      subtitle={pickingTemplate ? t('schedule.templates.subtitle') : undefined}
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

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('schedule.what')}</Text>
            <View style={styles.titleRow}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t('schedule.whatPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    flex: 1,
                    color: colors.textPrimary,
                    borderColor: colors.borderLight,
                    backgroundColor: colors.surface,
                    fontSize: 16 * fontScaleMultiplier,
                    minHeight: Math.max(48, tapMin * 0.95),
                  },
                ]}
              />
              <Pressable
                onPress={() => setPickingTemplate(true)}
                style={[
                  styles.templateBtn,
                  {
                    minHeight: Math.max(48, tapMin * 0.95),
                    borderColor: colors.borderLight,
                    backgroundColor: colors.surfaceMuted,
                  },
                ]}
              >
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                  {t('schedule.pickTemplate')}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('schedule.field')}</Text>
            <TaskChoiceChips
              options={
                fields.length === 0
                  ? [{ id: '', label: t('schedule.noFields') }]
                  : fields.map((field) => ({ id: field.id, label: field.name }))
              }
              value={fieldId}
              onChange={setFieldId}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('schedule.when.label')}
            </Text>
            <TaskChoiceChips
              options={TIMING_CHIPS.map((chip) => ({ id: chip.id, label: t(chip.labelKey) }))}
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

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('schedule.who')}</Text>
            <AssigneeSelector
              options={assigneeOptions}
              value={assigneeKey}
              onChange={setAssigneeKey}
            />
          </View>

          <Pressable onPress={() => setDetailsOpen((openNow) => !openNow)}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {detailsOpen ? t('schedule.lessDetails') : t('schedule.moreDetails')}
            </Text>
          </Pressable>

          {detailsOpen ? (
            <View style={styles.more}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('schedule.note')}</Text>
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
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t('schedule.repeat')}
                </Text>
                <TextInput
                  value={recurrence}
                  onChangeText={setRecurrence}
                  placeholder={t('schedule.repeatPlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                  style={[
                    styles.input,
                    {
                      color: colors.textPrimary,
                      borderColor: colors.borderLight,
                      backgroundColor: colors.surface,
                      minHeight: Math.max(48, tapMin * 0.95),
                    },
                  ]}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
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
  form: { gap: spacing.md },
  field: { gap: spacing.sm },
  label: { fontSize: 13, fontWeight: '700' },
  titleRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  area: { minHeight: 88, textAlignVertical: 'top' },
  templateBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  more: { gap: spacing.md },
  footer: { flexDirection: 'row', gap: 8 },
});

export default ScheduleWorkSheet;

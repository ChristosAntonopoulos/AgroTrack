import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import FormDateField from '../forms/FormDateField';
import type { Field } from '../../services/fieldService';
import type { CreateWorkRecordInput, Task, WorkRecord } from '../../services/taskService';
import { TaskChoiceChips } from './TaskChoiceChips';
import { useTheme } from '../../context/ThemeContext';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';
import { toDateInputValue } from '../../utils/proposalPresentation';
import { spacing } from '../../theme';

type Props = {
  open: boolean;
  fields: Field[];
  prefillFieldId?: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (input: CreateWorkRecordInput) => Promise<WorkRecord>;
  onLinkTask: (taskId: string, workRecordId: string) => Promise<void>;
  onFinished?: (record: WorkRecord) => void;
};

const RecordCompletedWorkSheet: React.FC<Props> = ({
  open,
  fields,
  prefillFieldId,
  busy,
  error,
  onClose,
  onSubmit,
  onLinkTask,
  onFinished,
}) => {
  const { t, i18n } = useTranslation(['tasks', 'capture']);
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const [fieldId, setFieldId] = useState('');
  const [title, setTitle] = useState('');
  const [completedAt, setCompletedAt] = useState(toDateInputValue(new Date().toISOString()));
  const [notes, setNotes] = useState('');
  const [created, setCreated] = useState<WorkRecord | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFieldId(prefillFieldId || fields[0]?.id || '');
    setTitle('');
    setCompletedAt(toDateInputValue(new Date().toISOString()));
    setNotes('');
    setCreated(null);
    setLocalError(null);
  }, [open, prefillFieldId, fields]);

  const canSubmit = Boolean(fieldId && title.trim() && !busy);

  const handleSave = async () => {
    if (!canSubmit) return;
    setLocalError(null);
    try {
      const record = await onSubmit({
        fieldId,
        title: title.trim(),
        completedAt: completedAt || undefined,
        notes: notes.trim() || undefined,
        offerPlannedTaskMatch: true,
      });
      if (record.matchingPlannedTasks && record.matchingPlannedTasks.length > 0) {
        setCreated(record);
      } else {
        onFinished?.(record);
        onClose();
      }
    } catch {
      setLocalError(t('capture:recordWork.saveFailed'));
    }
  };

  const finishCreated = (record: WorkRecord) => {
    onFinished?.(record);
    onClose();
  };

  const handleLink = async (task: Task) => {
    if (!created) return;
    setLinkBusy(true);
    setLocalError(null);
    try {
      await onLinkTask(task.id, created.id);
      finishCreated(created);
    } catch {
      setLocalError(t('capture:recordWork.linkFailed'));
    } finally {
      setLinkBusy(false);
    }
  };

  const matching = created?.matchingPlannedTasks || [];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      edge="bottom"
      size="lg"
      title={
        created
          ? t('capture:recordWork.linkTitle')
          : t('capture:types.recordWork.title')
      }
      subtitle={created ? t('capture:recordWork.linkBody') : undefined}
      footer={
        created ? (
          <Button title={t('capture:recordWork.skipLink')} onPress={() => finishCreated(created)} />
        ) : (
          <View style={styles.footer}>
            <Button title={t('schedule.cancel')} variant="outline" onPress={onClose} disabled={busy} />
            <Button
              title={t('capture:recordWork.save')}
              onPress={() => void handleSave()}
              disabled={!canSubmit}
              loading={busy}
            />
          </View>
        )
      }
    >
      {(error || localError) ? (
        <Text style={{ color: colors.error }}>{error || localError}</Text>
      ) : null}

      {created ? (
        <View style={styles.list}>
          {matching.map((task) => (
            <Pressable
              key={task.id}
              disabled={linkBusy}
              onPress={() => void handleLink(task)}
              style={[
                styles.match,
                {
                  borderColor: colors.borderLight,
                  backgroundColor: colors.surface,
                  minHeight: Math.max(52, tapMin),
                  opacity: linkBusy ? 0.6 : 1,
                },
              ]}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '700', flex: 1 }}>
                {taskDisplayTitle(task.title, task.templateCode, i18n.language)}
              </Text>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {t('capture:recordWork.linkAction')}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('capture:recordWork.what')}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('capture:recordWork.whatPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  color: colors.textPrimary,
                  borderColor: colors.borderLight,
                  backgroundColor: colors.surface,
                  fontSize: 16 * fontScaleMultiplier,
                  minHeight: Math.max(48, tapMin * 0.95),
                },
              ]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('schedule.field')}
            </Text>
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

          <FormDateField
            label={t('capture:recordWork.when')}
            value={completedAt}
            onValueChange={setCompletedAt}
          />

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('complete.notes')}
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={t('complete.notesPlaceholder')}
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
        </View>
      )}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  field: { gap: spacing.sm },
  label: { fontSize: 13, fontWeight: '700' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  area: { minHeight: 88, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', gap: 8 },
  list: { gap: spacing.sm },
  match: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});

export default RecordCompletedWorkSheet;

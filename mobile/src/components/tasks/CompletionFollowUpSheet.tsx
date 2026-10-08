import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import type { Task } from '../../services/taskService';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme';

type Props = {
  task: Task | null;
  open: boolean;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSaveDetails: (payload: { notes: string }) => void | Promise<void>;
  onDone: () => void;
};

const CompletionFollowUpSheet: React.FC<Props> = ({
  task,
  open,
  busy,
  error,
  onClose,
  onSaveDetails,
  onDone,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const { colors, tapMin } = useTheme();
  const [mode, setMode] = useState<'prompt' | 'details'>('prompt');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setMode('prompt');
    setNotes('');
  }, [open, task?.id]);

  const title = task ? taskDisplayTitle(task.title, task.templateCode, i18n.language) : '';

  return (
    <Sheet
      open={open && Boolean(task)}
      onClose={onClose}
      edge="bottom"
      size="md"
      title={mode === 'prompt' ? t('complete.followUpTitle') : t('complete.detailsTitle')}
      subtitle={title}
      footer={
        mode === 'prompt' ? (
          <View style={styles.footer}>
            <Button title={t('complete.done')} variant="outline" onPress={onDone} />
            <Button title={t('complete.addDetails')} onPress={() => setMode('details')} />
          </View>
        ) : (
          <View style={styles.footer}>
            <Button title={t('complete.done')} variant="outline" onPress={onDone} disabled={busy} />
            <Button
              title={t('complete.saveDetails')}
              disabled={busy}
              loading={busy}
              onPress={() => void onSaveDetails({ notes: notes.trim() })}
            />
          </View>
        )
      }
    >
      {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
      {mode === 'prompt' ? (
        <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>{t('complete.followUpBody')}</Text>
      ) : (
        <View style={styles.form}>
          <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t('complete.notes')}</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t('complete.notesPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            multiline
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                borderColor: colors.borderLight,
                backgroundColor: colors.surface,
                minHeight: Math.max(100, tapMin * 2),
              },
            ]}
          />
          <Text style={{ color: colors.textTertiary, fontSize: 13 }}>{t('complete.costPhotoHint')}</Text>
        </View>
      )}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  footer: { flexDirection: 'row', gap: 8 },
});

export default CompletionFollowUpSheet;

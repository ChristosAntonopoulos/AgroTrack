import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';
import { getNoteService } from '../../services/serviceFactory';
import { Note } from '../../services/noteService';
import { getApiErrorMessage } from '../../services/api';
import { spacing, typography } from '../../theme';

type FieldOption = { id: string; name: string };

type Props = {
  visible: boolean;
  note?: Note;
  fields: FieldOption[];
  onClose: () => void;
  onChanged?: () => void | Promise<void>;
};

const NoteSheet: React.FC<Props> = ({ visible, note, fields, onClose, onChanged }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { colors } = useTheme();
  const [body, setBody] = useState(note?.body || '');
  const [fieldId, setFieldId] = useState(note?.fieldId || '');
  const [pinned, setPinned] = useState(Boolean(note?.pinned));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const trimmed = body.trim();
    if (!trimmed) {
      setError(t('dashboard:notes.bodyRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { body: trimmed, fieldId: fieldId || null, pinned };
      if (note) {
        await getNoteService().updateNote(note.id, payload);
      } else {
        await getNoteService().createNote(payload);
      }
      await onChanged?.();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, t('common:error', { defaultValue: 'Something went wrong' })));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!note) return;
    setDeleting(true);
    setError(null);
    try {
      await getNoteService().deleteNote(note.id);
      await onChanged?.();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, t('common:error', { defaultValue: 'Something went wrong' })));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surfaceElevated }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {note ? t('dashboard:notes.editTitle') : t('dashboard:notes.newTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('dashboard:notes.subtitle')}
          </Text>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('dashboard:notes.bodyLabel')}
            </Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={4000}
              placeholder={t('dashboard:notes.placeholder')}
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.textarea,
                {
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('dashboard:notes.pinField')}
            </Text>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => setFieldId('')}
                style={[
                  styles.chip,
                  {
                    borderColor: !fieldId ? colors.primary : colors.border,
                    backgroundColor: !fieldId ? colors.primaryDark : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: !fieldId ? colors.textInverse : colors.textPrimary }}>
                  {t('dashboard:notes.noField')}
                </Text>
              </Pressable>
              {fields.map((f) => {
                const active = fieldId === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => setFieldId(f.id)}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primaryDark : 'transparent',
                      },
                    ]}
                  >
                    <Text style={{ color: active ? colors.textInverse : colors.textPrimary }}>
                      {f.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.switchRow}>
              <Text style={{ color: colors.textPrimary, flex: 1 }}>{t('dashboard:notes.pinTop')}</Text>
              <Switch value={pinned} onValueChange={setPinned} />
            </View>

            {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            {note ? (
              <Button
                variant="outline"
                onPress={() => void remove()}
                disabled={deleting || saving}
                title={t('common:delete', { defaultValue: 'Delete' })}
              />
            ) : (
              <View />
            )}
            <View style={styles.footerActions}>
              <Button variant="ghost" onPress={onClose} title={t('common:cancel', { defaultValue: 'Cancel' })} />
              <Button
                onPress={() => void save()}
                disabled={saving || !body.trim()}
                title={t('dashboard:notes.save')}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.lg,
  },
  title: { ...typography.styles.h5, fontSize: 18, fontWeight: '700' },
  subtitle: { marginTop: 4, marginBottom: spacing.md, fontSize: 13 },
  scroll: { maxHeight: 420 },
  label: { fontWeight: '600', marginBottom: 6, marginTop: 8 },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 120,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  error: { marginTop: 8, fontSize: 13 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: 8,
  },
  footerActions: { flexDirection: 'row', gap: 8 },
});

export default NoteSheet;

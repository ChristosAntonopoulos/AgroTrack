import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import FieldColorMark from '../fields/FieldColorMark';
import Button from '../ui/Button';
import { getNoteService } from '../../services/serviceFactory';
import { Note } from '../../services/noteService';
import { getApiErrorMessage } from '../../services/api';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { radii, spacing, typography } from '../../theme';

type FieldOption = { id: string; name: string; color?: string | null };

type Props = {
  visible: boolean;
  note?: Note;
  fields: FieldOption[];
  onClose: () => void;
  onChanged?: () => void | Promise<void>;
};

const NOTE_MAX = 4000;

const NoteSheet: React.FC<Props> = ({ visible, note, fields, onClose, onChanged }) => {
  const { t } = useTranslation(['dashboard', 'common', 'chronologio']);
  const { colors, tapMin } = useTheme();
  const [body, setBody] = useState(note?.body || '');
  const [fieldId, setFieldId] = useState(note?.fieldId || '');
  const [pinned, setPinned] = useState(Boolean(note?.pinned));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setBody(note?.body || '');
    setFieldId(note?.fieldId || '');
    setPinned(Boolean(note?.pinned));
    setError(null);
  }, [visible, note?.id, note?.body, note?.fieldId, note?.pinned]);

  const accent = colors.eventObservation;
  const accentSoft = colors.eventObservationSoft;

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
          <View style={[styles.accentBar, { backgroundColor: accent }]} />
          <Text style={[styles.kicker, { color: accent }]}>
            {t('chronologio:categoryLabel.note', { defaultValue: 'Observation' })}
          </Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {note ? t('dashboard:notes.editTitle') : t('dashboard:notes.newTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('dashboard:notes.subtitle')}
          </Text>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={[styles.legend, { color: accent }]}>{t('dashboard:notes.bodyLabel')}</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={NOTE_MAX}
              placeholder={t('dashboard:notes.placeholder')}
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.textarea,
                {
                  color: colors.textPrimary,
                  borderColor: accent,
                  backgroundColor: accentSoft,
                },
              ]}
            />
            <Text style={[styles.count, { color: colors.textTertiary }]}>
              {t('dashboard:notes.charCount', { count: body.length, max: NOTE_MAX })}
            </Text>

            <Text style={[styles.legend, { color: accent }]}>{t('dashboard:notes.pinField')}</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {t('dashboard:notes.fieldHint')}
            </Text>
            <View style={styles.fieldList}>
              <Pressable
                onPress={() => setFieldId('')}
                style={[
                  styles.fieldRow,
                  {
                    minHeight: tapMin,
                    borderColor: !fieldId ? accent : colors.border,
                    backgroundColor: !fieldId ? accentSoft : colors.surface,
                  },
                ]}
              >
                <FieldColorMark hollow size={10} />
                <Text style={{ color: colors.textPrimary, fontWeight: '600', flex: 1 }}>
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
                      styles.fieldRow,
                      {
                        minHeight: tapMin,
                        borderColor: active ? accent : colors.border,
                        backgroundColor: active ? accentSoft : colors.surface,
                      },
                    ]}
                  >
                    <FieldColorMark color={f.color} fieldId={f.id} size={10} />
                    <Text style={{ color: colors.textPrimary, fontWeight: '600', flex: 1 }}>
                      {friendlyFieldLabel(f.name)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setPinned((v) => !v)}
              style={[
                styles.pinToggle,
                {
                  minHeight: Math.max(56, tapMin),
                  borderColor: pinned ? accent : colors.border,
                  backgroundColor: pinned ? accentSoft : colors.surface,
                },
              ]}
              accessibilityRole="switch"
              accessibilityState={{ checked: pinned }}
            >
              <View
                style={[
                  styles.pinIcon,
                  { backgroundColor: pinned ? accent : colors.surfaceMuted },
                ]}
              >
                <Ionicons name="pin" size={16} color={pinned ? '#fff' : colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  {t('dashboard:notes.pinTop')}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                  {t('dashboard:notes.pinHint')}
                </Text>
              </View>
            </Pressable>

            {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            {note ? (
              <Button
                variant="ghost"
                onPress={() => void remove()}
                disabled={deleting || saving}
                title={t('common:delete', { defaultValue: 'Delete' })}
              />
            ) : (
              <View />
            )}
            <View style={styles.footerActions}>
              <Button variant="outline" onPress={onClose} title={t('common:cancel', { defaultValue: 'Cancel' })} />
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
    maxHeight: '92%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  kicker: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: { ...typography.styles.h5, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { marginTop: 4, marginBottom: spacing.md, fontSize: 13, lineHeight: 18 },
  scroll: { maxHeight: 460 },
  legend: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  hint: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  textarea: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 140,
    padding: 14,
    textAlignVertical: 'top',
    fontSize: 16,
    lineHeight: 24,
  },
  count: {
    alignSelf: 'flex-end',
    fontSize: 12,
    marginTop: 6,
    marginBottom: 12,
    fontVariant: ['tabular-nums'],
  },
  fieldList: { gap: 8, marginBottom: 12 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pinToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  pinIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { marginTop: 8, fontSize: 13, fontWeight: '600' },
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

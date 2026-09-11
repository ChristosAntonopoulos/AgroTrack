import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { useCaptureOptional } from '../context/CaptureContext';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import NoteSheet from '../components/dashboard/NoteSheet';
import { getFieldService, getNoteService } from '../services/serviceFactory';
import { Note, notePreviewTitle } from '../services/noteService';
import { Field } from '../services/fieldService';
import { spacing } from '../theme';
import { useRefresh } from '../hooks/useRefresh';

const NotesListScreen = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common', 'capture']);
  const { user } = useAuth();
  const { colors } = useTheme();
  const { tapMin } = usePreferences();
  const capture = useCaptureOptional();
  const [notes, setNotes] = useState<Note[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Note | null | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const fieldPromise =
        user?.id && user?.role
          ? getFieldService().getFields(user.id, user.role)
          : Promise.resolve([] as Field[]);
      const [noteList, fieldList] = await Promise.all([
        getNoteService().getNotes(),
        fieldPromise.catch(() => [] as Field[]),
      ]);
      setNotes(noteList);
      setFields(fieldList);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  const { refreshing, onRefresh } = useRefresh(async () => {
    await load();
  });

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <ScreenLayout scroll refreshControl={{ refreshing, onRefresh }} contentContainerStyle={styles.content}>
      <ScreenHeader
        title={t('capture:types.observation.title', { defaultValue: t('dashboard:notes.title') })}
        subtitle={t('dashboard:notes.pageSubtitle')}
        actionLabel={t('capture:cta', { defaultValue: t('dashboard:notes.newTitle') })}
        onActionPress={() =>
          capture
            ? capture.openCapture({ preferredType: 'observation' })
            : setEditing(null)
        }
      />

      {notes.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="document-text-outline" size={36} color={colors.textSecondary} />}
          title={t('dashboard:notes.emptyTitle')}
          description={t('dashboard:notes.emptyDescription')}
        />
      ) : (
        notes.map((note) => {
          const fieldName = note.fieldId
            ? fields.find((f) => f.id === note.fieldId)?.name
            : undefined;
          return (
            <TouchableOpacity
              key={note.id}
              onPress={() => setEditing(note)}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  minHeight: Math.max(tapMin, 56),
                },
              ]}
            >
              <View style={styles.rowTop}>
                {note.pinned ? (
                  <Ionicons name="pin" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                ) : null}
                <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                  {notePreviewTitle(note.body)}
                </Text>
              </View>
              <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={3}>
                {note.body}
              </Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {fieldName ? `${fieldName} · ` : ''}
                {new Date(note.updatedAt).toLocaleString(i18n.language)}
              </Text>
            </TouchableOpacity>
          );
        })
      )}

      {editing !== undefined ? (
        <NoteSheet
          visible
          note={editing || undefined}
          fields={fields.map((f) => ({ id: f.id, name: f.name }))}
          onClose={() => setEditing(undefined)}
          onChanged={load}
        />
      ) : null}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: spacing['3xl'] },
  card: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  title: { flex: 1, fontWeight: '700', fontSize: 16 },
  body: { fontSize: 14, marginBottom: 6 },
  meta: { fontSize: 12 },
});

export default NotesListScreen;

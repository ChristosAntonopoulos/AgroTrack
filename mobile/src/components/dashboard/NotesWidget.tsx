import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useCaptureOptional } from '../../context/CaptureContext';
import { getNoteService } from '../../services/serviceFactory';
import { Note, notePreviewTitle } from '../../services/noteService';
import { RootStackParamList } from '../../navigation/types';
import { spacing, typography } from '../../theme';
import NoteSheet from './NoteSheet';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export type NotesWidgetProps = {
  limit?: number;
  fieldNames?: Record<string, string>;
  fields?: Array<{ id: string; name: string }>;
  tapMin?: number;
  showSeeMore?: boolean;
  fieldId?: string;
};

const NotesWidget: React.FC<NotesWidgetProps> = ({
  limit = 3,
  fieldNames = {},
  fields = [],
  tapMin = 44,
  showSeeMore = true,
  fieldId,
}) => {
  const { t, i18n } = useTranslation(['dashboard', 'capture']);
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const capture = useCaptureOptional();
  const [notes, setNotes] = useState<Note[]>([]);
  const [editing, setEditing] = useState<Note | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await getNoteService().getNotes({ limit: Math.max(limit, 20) });
      setNotes(list);
    } catch {
      setNotes([]);
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => notes.slice(0, limit), [notes, limit]);

  const formatRelative = (iso: string) => {
    try {
      const ms = Date.now() - new Date(iso).getTime();
      const mins = Math.round(ms / 60000);
      if (mins < 1) return t('notes.justNow', { defaultValue: 'just now' });
      if (mins < 60) return t('notes.minutesAgo', { count: mins, defaultValue: `${mins}m ago` });
      const hours = Math.round(mins / 60);
      if (hours < 24) return t('notes.hoursAgo', { count: hours, defaultValue: `${hours}h ago` });
      const days = Math.round(hours / 24);
      return t('notes.daysAgo', { count: days, defaultValue: `${days}d ago` });
    } catch {
      return new Date(iso).toLocaleDateString(i18n.language);
    }
  };

  const openNew = () => {
    if (capture) {
      capture.openCapture({ preferredType: 'observation', fieldId });
      return;
    }
    navigation.navigate('Main', { screen: 'ChronologioTab' });
  };

  return (
    <View
      style={styles.wrap}
      accessibilityLabel={t('capture:types.observation.title', { defaultValue: t('notes.title') })}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('capture:types.observation.title', { defaultValue: t('notes.title') })}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={openNew}
            style={{ minHeight: tapMin, justifyContent: 'center', paddingHorizontal: 4 }}
            accessibilityRole="button"
          >
            <Text style={[styles.seeAll, { color: colors.primaryDark }]}>{t('capture:cta')}</Text>
          </TouchableOpacity>
          {showSeeMore ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('Main', { screen: 'ChronologioTab' })}
              style={{ minHeight: tapMin, justifyContent: 'center', paddingHorizontal: 4 }}
              accessibilityRole="button"
            >
              <Text style={[styles.seeAll, { color: colors.primaryDark }]}>{t('notes.seeAll')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {visible.length === 0 ? (
        <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>
          {t('notes.emptyDescription', { defaultValue: 'Record an observation from Καταγραφή.' })}
        </Text>
      ) : (
        visible.map((note) => {
          const fieldLabel = note.fieldId
            ? fieldNames[note.fieldId] || fields.find((f) => f.id === note.fieldId)?.name
            : undefined;
          return (
            <TouchableOpacity
              key={note.id}
              onPress={() => setEditing(note)}
              style={[
                styles.row,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceElevated,
                  minHeight: tapMin,
                },
              ]}
              accessibilityRole="button"
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                  {note.pinned ? '📌 ' : ''}
                  {notePreviewTitle(note.body) || '—'}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {fieldLabel ? `${fieldLabel} · ` : ''}
                  {formatRelative(note.updatedAt || note.createdAt)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          );
        })
      )}

      {editing ? (
        <NoteSheet
          visible
          note={editing}
          fields={fields}
          onClose={() => setEditing(null)}
          onChanged={() => {
            setEditing(null);
            void load();
          }}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { ...typography.styles.h3, fontWeight: '700', flex: 1 },
  seeAll: { fontWeight: '700', fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  rowTitle: { fontWeight: '600', marginBottom: 2 },
});

export default NotesWidget;

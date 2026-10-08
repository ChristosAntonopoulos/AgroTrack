import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { TaskSuggestion } from '../../services/taskService';
import { resolveTaskCategoryAccent } from '../../utils/taskCategoryAccents';
import { radii, spacing } from '../../theme';
import TaskCategoryGlyph from './TaskCategoryGlyph';

type Props = {
  suggestion: TaskSuggestion;
  fieldName: string;
  busy?: boolean;
  onSchedule: (suggestion: TaskSuggestion) => void;
  onDismiss: (suggestion: TaskSuggestion) => void;
};

const SuggestionCard: React.FC<Props> = ({
  suggestion,
  fieldName,
  busy,
  onSchedule,
  onDismiss,
}) => {
  const { t } = useTranslation('tasks');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const accent = resolveTaskCategoryAccent(suggestion.templateCode);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <View style={styles.hit}>
        <TaskCategoryGlyph templateCode={suggestion.templateCode} accent={accent} size={40} />
        <View style={styles.copy}>
          <Text
            style={[styles.title, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}
            numberOfLines={2}
          >
            {suggestion.title}
          </Text>
          <Text
            style={[styles.meta, { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }]}
            numberOfLines={2}
          >
            {fieldName}
            {suggestion.whyNow ? ` · ${suggestion.whyNow}` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => onSchedule(suggestion)}
          disabled={busy}
          style={[
            styles.primary,
            {
              minHeight: Math.max(44, tapMin * 0.92),
              backgroundColor: colors.primary,
              opacity: busy ? 0.6 : 1,
            },
          ]}
        >
          <Text style={{ color: colors.onOlive, fontWeight: '700' }}>
            {t('suggestions.schedule')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onDismiss(suggestion)}
          disabled={busy}
          style={[
            styles.secondary,
            {
              minHeight: Math.max(44, tapMin * 0.92),
              borderColor: colors.borderLight,
              opacity: busy ? 0.6 : 1,
            },
          ]}
        >
          <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
            {t('suggestions.dismiss')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: spacing.md,
    gap: spacing.sm,
  },
  hit: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontWeight: '700', lineHeight: 22 },
  meta: { lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8 },
  primary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  secondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
});

export default SuggestionCard;

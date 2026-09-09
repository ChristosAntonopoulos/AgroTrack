import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ChronologioEntry } from '../../services/chronologioService';
import { useTheme } from '../../context/ThemeContext';
import { formatRelativeTime, numberLocaleFor } from '../../utils/fieldDisplay';
import { spacing, typography } from '../../theme';

type Props = {
  entries: ChronologioEntry[];
  onSeeObservation: (entryId: string) => void;
};

const FieldAttentionCard: React.FC<Props> = ({ entries, onSeeObservation }) => {
  const { t, i18n } = useTranslation('fields');
  const { colors } = useTheme();
  const locale = numberLocaleFor(i18n.language);
  const attention = entries.find(
    (entry) =>
      entry.importance === 'warning' ||
      entry.importance === 'critical' ||
      (entry.category === 'note' && entry.importance === 'important')
  );

  if (!attention) return null;

  const note = attention.details.note?.bodyPreview || attention.summary || '';

  return (
    <View
      style={[
        styles.block,
        {
          backgroundColor: colors.warning + '18',
          borderColor: colors.warning + '55',
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('overview.needsAttention')}</Text>
      <Text style={[styles.entryTitle, { color: colors.textPrimary }]}>{attention.title}</Text>
      {note ? <Text style={{ color: colors.textSecondary }}>{note}</Text> : null}
      <Text style={{ color: colors.textTertiary }}>
        {t('overview.recorded', { when: formatRelativeTime(attention.occurredAt, locale) })}
      </Text>
      <Pressable onPress={() => onSeeObservation(attention.id)} style={styles.link}>
        <Text style={[styles.linkText, { color: colors.primaryDark }]}>{t('overview.seeObservation')}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  block: { borderWidth: 1, borderRadius: 14, padding: spacing.md, gap: 6 },
  title: { ...typography.styles.body, fontWeight: '800' },
  entryTitle: { fontWeight: '700', fontSize: 16 },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontWeight: '700' },
});

export default FieldAttentionCard;

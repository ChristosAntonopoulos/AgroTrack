import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ChronologioEntry } from '../../services/chronologioService';
import { useTheme } from '../../context/ThemeContext';
import { chronologioDetailLine, formatDayMonth, numberLocaleFor } from '../../utils/fieldDisplay';
import { spacing, typography } from '../../theme';

type Props = {
  entries: ChronologioEntry[];
  onSeeAll: () => void;
};

const FieldRecentChronologio: React.FC<Props> = ({ entries, onSeeAll }) => {
  const { t, i18n } = useTranslation(['fields', 'chronologio']);
  const { colors } = useTheme();
  const locale = numberLocaleFor(i18n.language);
  const items = entries.slice(0, 5);

  return (
    <View style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('fields:overview.recentChronologio')}</Text>
      {items.length === 0 ? (
        <Text style={{ color: colors.textTertiary }}>{t('chronologio:emptyFieldDescription')}</Text>
      ) : (
        items.map((entry) => {
          const detail = chronologioDetailLine(entry, locale);
          const thumb = entry.media?.find((m) => m.thumbnailUrl || m.url);
          const uri = thumb?.thumbnailUrl || thumb?.url;
          return (
            <View key={entry.id} style={styles.row}>
              <View style={styles.copy}>
                <Text style={[styles.time, { color: colors.textTertiary }]}>
                  {formatDayMonth(entry.occurredAt, locale)}
                </Text>
                <Text style={[styles.entryTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {entry.title}
                </Text>
                {detail ? (
                  <Text style={{ color: colors.textSecondary }} numberOfLines={2}>
                    {detail}
                  </Text>
                ) : null}
              </View>
              {uri ? <Image source={{ uri }} style={styles.thumb} /> : null}
            </View>
          );
        })
      )}
      <Pressable onPress={onSeeAll} style={styles.link}>
        <Text style={[styles.linkText, { color: colors.primaryDark }]}>
          {t('fields:overview.seeAllChronologio')}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  block: { borderWidth: 1, borderRadius: 14, padding: spacing.md, gap: 10 },
  title: { ...typography.styles.body, fontWeight: '800' },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  copy: { flex: 1, minWidth: 0 },
  time: { fontSize: 12, fontWeight: '700' },
  entryTitle: { fontWeight: '700' },
  thumb: { width: 48, height: 48, borderRadius: 8 },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontWeight: '700' },
});

export default FieldRecentChronologio;

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { ChronologioEntry } from '../../services/chronologioService';
import { numberLocaleFor } from '../../utils/fieldDisplay';
import { typography } from '../../theme';
import ChronologioEntryCard from './ChronologioEntryCard';
import FieldOverviewCard from '../fields/FieldOverviewCard';

type Props = {
  entries: ChronologioEntry[];
  /** Max rows to show (default 5). */
  limit?: number;
  title?: string;
  emptyLabel?: string;
  seeAllLabel?: string;
  onSeeAll?: () => void;
  onPressEntry?: (entry: ChronologioEntry) => void;
  showField?: boolean;
  /** When true, wrap in the overview bordered block (field home). */
  framed?: boolean;
};

/**
 * Shared recent Chronologio list — field overview + peeks use the same card grammar.
 */
const ChronologioRecentList: React.FC<Props> = ({
  entries,
  limit = 5,
  title,
  emptyLabel,
  seeAllLabel,
  onSeeAll,
  onPressEntry,
  showField = false,
  framed = false,
}) => {
  const { t, i18n } = useTranslation(['chronologio', 'fields']);
  const { colors } = useTheme();
  const numberLocale = numberLocaleFor(i18n.language);
  const items = (Array.isArray(entries) ? entries : []).slice(0, limit);
  const resolvedEmpty = emptyLabel || t('chronologio:living.emptyPeriod');

  const body = (
    <>
      {title ? (
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      ) : null}
      {items.length === 0 ? (
        <Text style={{ color: colors.textTertiary }}>{resolvedEmpty}</Text>
      ) : (
        items.map((entry) => (
          <ChronologioEntryCard
            key={entry.id}
            entry={entry}
            density="compact"
            dateStyle="dayMonth"
            showField={showField}
            numberLocale={numberLocale}
            onPress={() => onPressEntry?.(entry)}
          />
        ))
      )}
      {onSeeAll && seeAllLabel ? (
        <Pressable onPress={onSeeAll} style={styles.link} hitSlop={6}>
          <Text style={[styles.linkText, { color: colors.primary }]}>{seeAllLabel}</Text>
        </Pressable>
      ) : null}
    </>
  );

  if (!framed) {
    return <View style={styles.stack}>{body}</View>;
  }

  return <FieldOverviewCard>{body}</FieldOverviewCard>;
};

const styles = StyleSheet.create({
  stack: { gap: 0 },
  title: {
    ...typography.styles.body,
    fontWeight: '700',
    marginBottom: 6,
  },
  link: {
    minHeight: 40,
    justifyContent: 'center',
    marginTop: 2,
  },
  linkText: { fontWeight: '700', fontSize: 14 },
});

export default ChronologioRecentList;

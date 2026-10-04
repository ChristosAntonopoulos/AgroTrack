import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { getHarvestService } from '../../services/serviceFactory';
import {
  summarizeHarvestByYear,
  type FieldHarvestYearSummary,
} from '../../utils/fieldHarvestYears';
import { formatSeasonShortLabel } from '../../utils/harvestSeason';
import { createElevation, radii, spacing, typography } from '../../theme';

type Props = {
  fieldId: string;
  onOpenHarvest: () => void;
};

const formatLine = (
  row: FieldHarvestYearSummary,
  t: (key: string, opts?: Record<string, unknown>) => string,
  locale: string
): string => {
  const parts: string[] = [];
  if (row.sacks > 0) {
    parts.push(t('page.harvest.sacksCount', { count: row.sacks, defaultValue: '{{count}} σάκοι' }));
  }
  if (row.oliveKg > 0) {
    parts.push(
      t('page.harvest.kgCount', {
        count: Math.round(row.oliveKg).toLocaleString(locale),
        defaultValue: '{{count}} kg',
      })
    );
  }
  if (row.oilLitres > 0) {
    parts.push(
      t('page.harvest.oilCount', {
        count: Math.round(row.oilLitres).toLocaleString(locale),
        defaultValue: '{{count}} L',
      })
    );
  } else if (row.oilKg > 0) {
    parts.push(
      t('page.harvest.oilKgCount', {
        count: Math.round(row.oilKg).toLocaleString(locale),
        defaultValue: '{{count}} kg λάδι',
      })
    );
  }
  if (!parts.length) {
    return t('page.harvest.recorded', {
      count: row.recordCount,
      defaultValue: '{{count}} καταγραφές',
    });
  }
  return parts.join(' · ');
};

/** One elegant row per harvest season with σάκοι / kg / oil. */
const FieldHarvestYearsCard: React.FC<Props> = ({ fieldId, onOpenHarvest }) => {
  const { t, i18n } = useTranslation('fields');
  const { colors, tapMin } = useTheme();
  const [rows, setRows] = useState<FieldHarvestYearSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const locale = i18n.language?.startsWith('el')
    ? 'el-GR'
    : i18n.language?.startsWith('it')
      ? 'it-IT'
      : 'en-GB';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getHarvestService()
      .listByField(fieldId)
      .then((records) => {
        if (!cancelled) setRows(summarizeHarvestByYear(records));
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldId]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          ...createElevation(colors, 'sm'),
        },
      ]}
    >
      <Pressable
        onPress={onOpenHarvest}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={t('page.harvest.title', { defaultValue: 'Συγκομιδή' })}
      >
        <View style={[styles.headerIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="leaf-outline" size={18} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {t('page.harvest.title', { defaultValue: 'Συγκομιδή' })}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.sm }} />
      ) : rows.length === 0 ? (
        <Pressable
          onPress={onOpenHarvest}
          style={[styles.empty, { minHeight: Math.max(48, tapMin) }]}
          accessibilityRole="button"
        >
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('page.harvest.empty', { defaultValue: 'Δεν υπάρχει ακόμη συγκομιδή για αυτόν τον ελαιώνα.' })}
          </Text>
          <Text style={[styles.emptyCta, { color: colors.primary }]}>
            {t('page.harvest.emptyAction', { defaultValue: 'Καταγραφή συγκομιδής' })}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.list}>
          {rows.map((row, index) => {
            const primary = index === 0;
            return (
              <Pressable
                key={row.seasonStartYear}
                onPress={onOpenHarvest}
                style={[
                  styles.row,
                  {
                    minHeight: Math.max(52, tapMin * 0.9),
                    backgroundColor: primary ? colors.primaryLight : 'transparent',
                    borderColor: primary ? colors.oliveBorder : colors.borderLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.year,
                    { color: primary ? colors.primary : colors.textPrimary },
                  ]}
                >
                  {formatSeasonShortLabel(row.seasonStartYear)}
                </Text>
                <Text
                  style={[styles.detail, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {formatLine(row, t, locale)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.styles.body,
    flex: 1,
    fontWeight: '700',
    fontSize: 16,
  },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  year: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 56,
  },
  detail: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  empty: {
    gap: 4,
    paddingVertical: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCta: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default FieldHarvestYearsCard;

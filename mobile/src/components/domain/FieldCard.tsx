import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Field } from '../../services/fieldService';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { spacing, radii, typography } from '../../theme';
import { createElevation } from '../../theme/elevation';
import FieldIdentity from '../fields/FieldIdentity';
import FieldPolygonThumbnail from '../fields/FieldPolygonThumbnail';

export interface FieldCardStats {
  todayTaskCount: number;
}

interface FieldCardProps {
  field: Field;
  stats: FieldCardStats;
  selected?: boolean;
  onPress?: () => void;
}

const FieldCard: React.FC<FieldCardProps> = ({ field, stats, selected, onPress }) => {
  const { colors } = useTheme();
  const { tapMin } = usePreferences();
  const { t } = useTranslation('fields');
  const hasTasks = stats.todayTaskCount > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: selected ? colors.surfaceSelected : colors.surface,
          borderColor: selected ? colors.oliveBorder : colors.borderLight,
          minHeight: Math.max(tapMin + 28, 96),
          opacity: pressed ? 0.92 : 1,
          borderLeftWidth: hasTasks ? 4 : 1,
          borderLeftColor: hasTasks ? colors.primary : selected ? colors.oliveBorder : colors.borderLight,
          ...createElevation(colors, 'sm'),
        },
      ]}
    >
      <View style={styles.main}>
        <FieldIdentity field={field} size="card" />
        <View style={styles.footer}>
          <View
            style={[
              styles.todayPill,
              {
                backgroundColor: hasTasks ? colors.primaryLight : colors.surfaceMuted,
                borderColor: hasTasks ? colors.oliveBorder : colors.borderLight,
              },
            ]}
          >
            <Text
              style={[
                styles.today,
                { color: hasTasks ? colors.link : colors.textSecondary },
              ]}
            >
              {t('card.todayTasks', { count: stats.todayTaskCount })}
            </Text>
          </View>
          <View style={styles.openRow}>
            <Text style={[styles.open, { color: colors.link }]}>{t('card.open')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.link} />
          </View>
        </View>
      </View>
      <FieldPolygonThumbnail field={field} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  main: { flex: 1, minWidth: 0, gap: spacing.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  todayPill: {
    flexShrink: 1,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 28,
    justifyContent: 'center',
  },
  today: { ...typography.styles.caption, fontWeight: '600' },
  openRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  open: { fontSize: 13, fontWeight: '700' },
});

export default FieldCard;

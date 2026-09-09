import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Field } from '../../services/fieldService';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { spacing } from '../../theme';
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

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: selected ? colors.primary : colors.borderLight,
          minHeight: Math.max(tapMin + 28, 96),
          opacity: pressed ? 0.92 : 1,
          ...createElevation(colors, 'sm'),
        },
      ]}
    >
      <View style={styles.main}>
        <FieldIdentity field={field} size="card" />
        <Text style={[styles.today, { color: colors.textSecondary }]}>
          {t('card.todayTasks', { count: stats.todayTaskCount })}
        </Text>
        <Text style={[styles.open, { color: colors.primaryDark }]}>{t('card.open')}</Text>
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
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  main: { flex: 1, minWidth: 0 },
  today: { marginTop: spacing.sm, fontSize: 13, fontWeight: '600' },
  open: { marginTop: 4, fontSize: 13, fontWeight: '700' },
});

export default FieldCard;

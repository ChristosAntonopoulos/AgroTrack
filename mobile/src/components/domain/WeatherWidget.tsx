import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import { createElevation } from '../../theme/elevation';
import { WeatherData } from '../../services/weatherService';
import LoadingSpinner from '../LoadingSpinner';

export interface WeatherWidgetProps {
  weather: WeatherData | null;
  loading?: boolean;
  high?: number;
  low?: number;
  namespace?: 'dashboard' | 'fields';
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  weather,
  loading,
  high,
  low,
  namespace = 'dashboard',
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation(namespace);

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
        <LoadingSpinner size="small" />
      </View>
    );
  }

  if (!weather) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          {namespace === 'fields' ? t('weather.unavailable') : t('weatherUnavailable')}
        </Text>
      </View>
    );
  }

  const displayHigh = high ?? weather.high ?? Math.round(weather.temperature + 4);
  const displayLow = low ?? weather.low ?? Math.round(weather.temperature - 4);
  const titleKey = namespace === 'fields' ? 'weather.today' : 'weatherToday';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.borderLight,
          ...createElevation(colors, 'sm'),
        },
      ]}
    >
      <View style={styles.header}>
        <Ionicons name="partly-sunny-outline" size={16} color={colors.primaryDark} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t(titleKey)}</Text>
      </View>
      <View style={styles.main}>
        <Text style={styles.emoji}>{weather.icon}</Text>
        <View>
          <Text style={[styles.temp, { color: colors.textPrimary }]}>{weather.temperature}°</Text>
          <Text style={[styles.condition, { color: colors.textSecondary }]}>
            {weather.condition.replace('_', ' ')}
          </Text>
        </View>
      </View>
      <View style={[styles.meta, { borderTopColor: colors.borderLight }]}>
        <MetaItem icon="arrow-up-outline" label={`${displayHigh}°`} colors={colors} />
        <MetaItem icon="arrow-down-outline" label={`${displayLow}°`} colors={colors} />
        <MetaItem icon="water-outline" label={`${weather.humidity}%`} colors={colors} />
        <MetaItem icon="flag-outline" label={`${weather.windSpeed}`} colors={colors} suffix="km/h" />
      </View>
      {namespace === 'fields' ? (
        <>
          <Text style={[styles.outlook, { color: colors.textSecondary }]}>
            {weather.rainForecast24hMm != null && weather.rainForecast24hMm >= 0.5
              ? t('weather.rainNext24h', { mm: weather.rainForecast24hMm.toFixed(1) })
              : t('weather.rainNone')}
          </Text>
          {weather.frostLevel && weather.frostLevel !== 'None' ? (
            <Text style={[styles.frost, { color: colors.warning }]}>
              {t('weather.frostRisk', { level: weather.frostLevel })}
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
};

const MetaItem = ({
  icon,
  label,
  suffix,
  colors,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  suffix?: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) => (
  <View style={styles.metaItem}>
    <Ionicons name={icon} size={12} color={colors.textTertiary} />
    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
      {label}
      {suffix ? ` ${suffix}` : ''}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
    minHeight: 140,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  title: { ...typography.styles.bodySmall, fontWeight: '700' },
  main: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  emoji: { fontSize: 32 },
  temp: { ...typography.styles.h2, fontWeight: '700', fontSize: 26 },
  condition: { ...typography.styles.caption, textTransform: 'capitalize' },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 10, fontWeight: '600' },
  outlook: { ...typography.styles.caption, fontSize: 11, lineHeight: 15, marginTop: 4 },
  frost: { ...typography.styles.caption, fontSize: 11, fontWeight: '600', lineHeight: 15 },
});

export default WeatherWidget;

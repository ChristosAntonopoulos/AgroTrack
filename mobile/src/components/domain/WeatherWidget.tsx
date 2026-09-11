import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
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

const resolveAdviceKey = (weather: WeatherData): 'adviceFrost' | 'adviceRain' | 'adviceOk' => {
  if (weather.frostLevel && weather.frostLevel !== 'None') return 'adviceFrost';
  if (weather.rainForecast24hMm != null && weather.rainForecast24hMm >= 0.5) return 'adviceRain';
  return 'adviceOk';
};

const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  weather,
  loading,
  high,
  low,
  namespace = 'dashboard',
}) => {
  const { colors } = useTheme();
  const { isEveryday, fontScaleMultiplier, tapMin } = usePreferences();
  const { t } = useTranslation(namespace);
  const [showDetails, setShowDetails] = useState(false);

  const adviceKey = useMemo(
    () => (weather && namespace === 'fields' ? resolveAdviceKey(weather) : null),
    [weather, namespace]
  );

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
  const showNumbers = !isEveryday || namespace !== 'fields' || showDetails;

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
        <Ionicons name="partly-sunny-outline" size={16} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: 14 * fontScaleMultiplier }]}>
          {t(titleKey)}
        </Text>
      </View>

      {adviceKey ? (
        <Text style={[styles.advice, { color: colors.primary, fontSize: 15 * fontScaleMultiplier }]}>
          {t(`weather.${adviceKey}`)}
        </Text>
      ) : null}

      {namespace === 'fields' ? (
        <View style={styles.chips}>
          <Text style={[styles.chip, { backgroundColor: colors.surfaceMuted, color: colors.textSecondary }]}>
            {weather.rainForecast24hMm != null && weather.rainForecast24hMm >= 0.5
              ? t('weather.rainNext24h', { mm: weather.rainForecast24hMm.toFixed(1) })
              : t('weather.rainNone')}
          </Text>
          {weather.frostLevel && weather.frostLevel !== 'None' ? (
            <Text style={[styles.chip, { backgroundColor: colors.warning + '33', color: colors.warning }]}>
              {t('weather.frostRisk', { level: weather.frostLevel })}
            </Text>
          ) : null}
        </View>
      ) : null}

      {isEveryday && namespace === 'fields' && !showDetails ? (
        <Pressable onPress={() => setShowDetails(true)} style={{ minHeight: tapMin, justifyContent: 'center' }}>
          <Text style={[styles.peek, { color: colors.primary, fontSize: 13 * fontScaleMultiplier }]}>
            {t('weather.showDetails')}
          </Text>
        </Pressable>
      ) : null}

      {showNumbers ? (
        <>
          <View style={styles.main}>
            <Text style={styles.emoji}>{weather.icon}</Text>
            <View>
              <Text style={[styles.temp, { color: colors.textPrimary, fontSize: 28 * fontScaleMultiplier }]}>
                {weather.temperature}°
              </Text>
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
        </>
      ) : null}
    </View>
  );
};

const MetaItem = ({
  icon,
  label,
  colors,
  suffix,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
  suffix?: string;
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
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { ...typography.styles.caption, fontWeight: '700' },
  advice: { fontWeight: '700', lineHeight: 20 },
  peek: { fontWeight: '600', textDecorationLine: 'underline' },
  main: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 36 },
  temp: { fontWeight: '800' },
  condition: { ...typography.styles.bodySmall, textTransform: 'capitalize' },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.styles.caption, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    ...typography.styles.caption,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
});

export default WeatherWidget;

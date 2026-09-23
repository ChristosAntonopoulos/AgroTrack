import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing } from '../../theme';
import type { DayWeatherView } from '../../chronologio/dayWeather';

type Props = {
  weather: DayWeatherView;
  onOpen?: () => void;
};

const DailyWeatherStrip: React.FC<Props> = ({ weather, onOpen }) => {
  const { t, i18n } = useTranslation(['chronologio', 'today']);
  const { colors, tapMin } = useTheme();
  const numberLocale = i18n.language?.startsWith('el') ? 'el-GR' : 'en-US';

  const rainLabel =
    weather.rain.kind === 'missing'
      ? null
      : weather.rain.kind === 'zero'
        ? t('chronologio:todayCard.noRain')
        : t('chronologio:todayCard.rainMm', {
            mm: (weather.rain.value ?? 0).toLocaleString(numberLocale, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 1,
            }),
          });

  const bits = weather.missing
    ? [t('chronologio:todayCard.weatherMissing')]
    : [weather.tempLabel, rainLabel, weather.windBft != null ? t('today:brief.conditions.windBft', { bft: weather.windBft }) : null].filter(
        Boolean
      );

  const inner = (
    <View style={styles.row}>
      <Ionicons name="partly-sunny-outline" size={16} color={colors.weatherBlue} />
      <Text style={[styles.text, { color: colors.textSecondary }]} numberOfLines={1}>
        {bits.join(' · ')}
      </Text>
    </View>
  );

  if (!onOpen) {
    return <View style={styles.wrap}>{inner}</View>;
  }

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={t('chronologio:living.weatherButton')}
      style={({ pressed }) => [
        styles.wrap,
        styles.button,
        {
          minHeight: Math.max(32, tapMin * 0.7),
          opacity: pressed ? 0.7 : 1,
          backgroundColor: colors.surfaceMuted,
        },
      ]}
    >
      {inner}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: { marginTop: 4, marginBottom: spacing.xs, alignSelf: 'flex-start', maxWidth: '100%' },
  button: { borderRadius: radii.full, paddingHorizontal: 10, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
});

export default DailyWeatherStrip;

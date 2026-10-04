import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { radii } from '../../theme';
import type { FieldWeather } from '../../services/geospatialService';
import {
  formatForecastRain,
  forecastHasRain,
  presentGroveForecast,
} from '../../weather/presentGroveForecast';

type Props = {
  fieldWeather?: FieldWeather | null;
  variant?: 'compact' | 'detail';
};

const iconFor = (
  condition: string
): React.ComponentProps<typeof Ionicons>['name'] => {
  if (condition === 'storm') return 'thunderstorm-outline';
  if (condition === 'rain') return 'rainy-outline';
  if (condition === 'snow') return 'snow-outline';
  if (condition === 'clear') return 'sunny-outline';
  if (condition === 'partly') return 'partly-sunny-outline';
  return 'cloud-outline';
};

const GroveWeekForecast: React.FC<Props> = ({ fieldWeather, variant = 'compact' }) => {
  const { t, i18n } = useTranslation('chronologio');
  const { colors } = useTheme();
  const days = presentGroveForecast(fieldWeather);
  if (days.length < 2) return null;

  const showRain = forecastHasRain(days);
  const iconSize = variant === 'detail' ? 18 : 15;
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel={variant === 'compact' ? t('weatherPeek.week') : undefined}
    >
      {days.map((day) => {
        const when = new Date(`${day.date}T12:00:00Z`);
        const weekday = when
          .toLocaleDateString(i18n.language, { weekday: 'short', timeZone: 'UTC' })
          .replace(/\.$/, '');
        const rain = formatForecastRain(day.rainMm);
        const isToday = day.date === todayKey;
        return (
          <View
            key={day.date}
            style={[
              styles.cell,
              {
                backgroundColor: isToday ? colors.eventWeatherSoft : 'transparent',
                borderColor: isToday ? colors.borderLight : 'transparent',
              },
            ]}
          >
            <Text style={[styles.dow, { color: colors.textSecondary }]}>{weekday}</Text>
            <Ionicons name={iconFor(day.conditionKey)} size={iconSize} color={colors.weatherBlue} />
            <Text style={[styles.high, { color: colors.textPrimary }]}>
              {day.high != null ? `${day.high}°` : '—'}
            </Text>
            {variant === 'detail' && day.low != null ? (
              <Text style={[styles.low, { color: colors.textTertiary }]}>{day.low}°</Text>
            ) : null}
            {showRain ? (
              <Text
                style={[
                  styles.rain,
                  { color: rain ? colors.rain : colors.textTertiary },
                ]}
              >
                {rain ? `${rain}` : '·'}
              </Text>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { gap: 4, paddingVertical: 2 },
  cell: {
    minWidth: 44,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dow: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  high: { fontSize: 13, fontWeight: '800' },
  low: { fontSize: 11, fontWeight: '600' },
  rain: { fontSize: 10, fontWeight: '700' },
});

export default GroveWeekForecast;

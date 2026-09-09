import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Task } from '../../services/taskService';
import { weatherService, WeatherData } from '../../services/weatherService';
import { useTheme } from '../../context/ThemeContext';
import { formatCompactDate, getNextUpcomingTask, kmhToBeaufort, numberLocaleFor } from '../../utils/fieldDisplay';
import { spacing, typography } from '../../theme';

type Props = {
  fieldId: string;
  tasks: Task[];
  onOpenWeather: () => void;
};

const FieldTodaySummary: React.FC<Props> = ({ fieldId, tasks, onOpenWeather }) => {
  const { t, i18n } = useTranslation(['fields', 'chronologio']);
  const { colors } = useTheme();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const nextTask = getNextUpcomingTask(tasks);
  const locale = numberLocaleFor(i18n.language);

  useEffect(() => {
    let cancelled = false;
    weatherService
      .getFieldWeatherData(fieldId)
      .then((data) => {
        if (!cancelled) setWeather(data);
      })
      .catch(() => {
        if (!cancelled) setWeather(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldId]);

  const rainLabel =
    weather && (weather.precipitation > 0 || (weather.rainForecast24hMm ?? 0) >= 0.5)
      ? t('fields:overview.withRain')
      : t('fields:overview.noRain');
  const wind = weather ? kmhToBeaufort(weather.windSpeed) : null;

  return (
    <View style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('fields:overview.todayTitle')}</Text>
      {weather ? (
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {weather.temperature}°C · {rainLabel}
          {wind != null ? ` · ${t('fields:overview.windBft', { value: wind })}` : ''}
        </Text>
      ) : (
        <Text style={[styles.body, { color: colors.textTertiary }]}>{t('fields:weather.unavailable')}</Text>
      )}
      <Text style={[styles.sub, { color: colors.textPrimary }]}>{t('fields:overview.nextTask')}</Text>
      {nextTask ? (
        <>
          <Text style={[styles.nextTitle, { color: colors.textPrimary }]}>{nextTask.title}</Text>
          {nextTask.scheduledEnd || nextTask.scheduledStart ? (
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              {formatCompactDate(nextTask.scheduledEnd || nextTask.scheduledStart || '', locale)}
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={[styles.body, { color: colors.textTertiary }]}>{t('fields:overview.noNextTask')}</Text>
      )}
      <Pressable onPress={onOpenWeather} style={styles.link}>
        <Text style={[styles.linkText, { color: colors.primaryDark }]}>
          {t('chronologio:weatherVegetation.button')} →
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  block: { borderWidth: 1, borderRadius: 14, padding: spacing.md, gap: 6 },
  title: { ...typography.styles.body, fontWeight: '800' },
  sub: { marginTop: spacing.sm, fontWeight: '700' },
  nextTitle: { fontWeight: '700', fontSize: 16 },
  body: { ...typography.styles.bodySmall },
  link: { marginTop: spacing.sm, minHeight: 44, justifyContent: 'center' },
  linkText: { fontWeight: '700' },
});

export default FieldTodaySummary;

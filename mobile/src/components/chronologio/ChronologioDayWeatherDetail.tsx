import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme';
import type { ChronologioEntry } from '../../services/chronologioService';
import { buildDayWeatherView, type DayWeatherInput } from '../../chronologio/dayWeather';
import { presentChronologioEvent } from '../../chronologio/eventPresentation';

type Props = {
  dateKey: string;
  weather: DayWeatherInput | null;
  events: ChronologioEntry[];
  numberLocale: string;
  sharedWeatherGrid?: boolean;
  relatedFieldNames?: string[];
  onSelectEvent?: (entry: ChronologioEntry) => void;
};

const ChronologioDayWeatherDetail: React.FC<Props> = ({
  dateKey,
  weather,
  events,
  numberLocale,
  sharedWeatherGrid,
  relatedFieldNames,
  onSelectEvent,
}) => {
  const { t, i18n } = useTranslation(['chronologio', 'today']);
  const { colors } = useTheme();
  const view = buildDayWeatherView(weather, numberLocale);
  const rainLabel =
    view.rain.kind === 'missing'
      ? t('chronologio:todayCard.weatherMissing')
      : view.rain.kind === 'zero'
        ? t('chronologio:todayCard.noRain')
        : t('chronologio:todayCard.rainMm', {
            mm: (view.rain.value ?? 0).toLocaleString(numberLocale, {
              maximumFractionDigits: 1,
            }),
          });
  const tasks = events.filter((e) => e.category === 'task');
  const others = events.filter((e) => e.category !== 'task' && e.eventType !== 'weather.monthReview');

  const Fact = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.fact}>
      <Text style={[styles.dt, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.dd, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );

  return (
    <View nativeID={dateKey}>
      {sharedWeatherGrid && relatedFieldNames && relatedFieldNames.length > 1 ? (
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          {t('drawer.sharedWeatherGrid', { fields: relatedFieldNames.join(' · ') })}
        </Text>
      ) : null}

      {view.missing && !weather ? (
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          {t('chronologio:todayCard.weatherMissing')}
        </Text>
      ) : (
        <View style={styles.facts}>
          <Fact label={t('weatherReview.tempRange')} value={view.tempLabel || '—'} />
          <Fact label={t('weatherReview.rainfall', { defaultValue: t('weatherReview.rainMm') })} value={rainLabel} />
          {view.windBft != null ? (
            <Fact label={t('drawer.wind')} value={t('today:brief.conditions.windBft', { bft: view.windBft })} />
          ) : null}
          {weather?.gustKmh != null ? (
            <Fact
              label={t('chronologio:todayCard.gust', { kmh: Math.round(weather.gustKmh) })}
              value={`${weather.gustKmh.toLocaleString(numberLocale, { maximumFractionDigits: 0 })} km/h`}
            />
          ) : null}
          {weather?.humidityPercent != null ? (
            <Fact label={t('drawer.humidity')} value={`${Math.round(weather.humidityPercent)}%`} />
          ) : null}
          {weather?.et0Mm != null ? (
            <Fact
              label={t('weatherVegetation.et0Label', { defaultValue: t('weatherVegetation.et0Mm') })}
              value={`${weather.et0Mm.toLocaleString(numberLocale, { maximumFractionDigits: 1 })} mm`}
            />
          ) : null}
          {weather?.waterBalanceMm != null ? (
            <Fact
              label={t('weatherReview.waterBalance')}
              value={`${weather.waterBalanceMm.toLocaleString(numberLocale, { maximumFractionDigits: 0 })} mm`}
            />
          ) : null}
          {weather?.frost ? <Fact label={t('drawer.frost')} value={t('today:brief.conditions.frost')} /> : null}
          {weather?.heat ? <Fact label={t('weatherReview.heatDays')} value={t('drawer.heat')} /> : null}
          <Fact label={t('drawer.dataType')} value={t('drawer.historicalData', { defaultValue: t('drawer.measured') })} />
          {weather?.source ? <Fact label={t('drawer.source')} value={weather.source} /> : null}
          {weather?.updatedAt ? (
            <Fact
              label={t('chronologio:todayCard.updated', { time: '' })}
              value={new Date(weather.updatedAt).toLocaleString(i18n.language, {
                dateStyle: 'medium',
                timeStyle: 'short',
                hour12: false,
              })}
            />
          ) : null}
        </View>
      )}

      {tasks.length ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('drawer.affectedTasks')}</Text>
          {tasks.map((e) => (
            <Pressable key={e.id} onPress={() => onSelectEvent?.(e)} style={styles.link}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {presentChronologioEvent(e, i18n.language).label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {others.length ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('drawer.dayEvents')}</Text>
          {others.map((e) => (
            <Pressable key={e.id} onPress={() => onSelectEvent?.(e)} style={styles.link}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {presentChronologioEvent(e, i18n.language).label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  note: { fontSize: 13, lineHeight: 20, marginBottom: spacing.md },
  facts: { gap: spacing.md },
  fact: { gap: 2 },
  dt: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  dd: { fontSize: 16, fontWeight: '600' },
  section: { marginTop: spacing.lg, gap: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  link: { paddingVertical: 6 },
});

export default ChronologioDayWeatherDetail;

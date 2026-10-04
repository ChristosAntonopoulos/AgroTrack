import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing, typography, createElevation, motion } from '../../theme';
import type { FieldWeather } from '../../services/geospatialService';
import type { WeatherData } from '../../services/weatherService';
import GroveWeekForecast from './GroveWeekForecast';
import { presentGroveWeather, type GroveWeatherMood } from '../../weather/presentGroveWeather';

type Props = {
  fieldWeather?: FieldWeather | null;
  snapshot?: WeatherData | null;
  fieldName?: string | null;
  scopeNote?: string;
  onPress?: () => void;
  embedded?: boolean;
  compact?: boolean;
};

const moodSkyLight: Record<GroveWeatherMood, [string, string]> = {
  clear: ['#F3EBD4', '#F2F3EC'],
  cloud: ['#EBECE4', '#F2F3EC'],
  rain: ['#E6EEF0', '#F2F3EC'],
  frost: ['#E8F0F4', '#F2F3EC'],
  heat: ['#F3E7E3', '#F2F3EC'],
  storm: ['#EEEAF2', '#F2F3EC'],
  wind: ['#E6EEF0', '#F2F3EC'],
  missing: ['#F2F3EC', '#F2F3EC'],
};

const moodSkyDark: Record<GroveWeatherMood, [string, string]> = {
  clear: ['#2d3a2a', '#202520'],
  cloud: ['#272D27', '#202520'],
  rain: ['#1B2730', '#202520'],
  frost: ['#182430', '#202520'],
  heat: ['#32241C', '#202520'],
  storm: ['#1a1820', '#202520'],
  wind: ['#1C2628', '#202520'],
  missing: ['#202520', '#202520'],
};

const moodGlow: Record<GroveWeatherMood, string> = {
  clear: 'rgba(232, 196, 96, 0.28)',
  cloud: 'rgba(150, 164, 170, 0.18)',
  rain: 'rgba(90, 150, 190, 0.22)',
  frost: 'rgba(170, 210, 235, 0.32)',
  heat: 'rgba(214, 122, 103, 0.22)',
  storm: 'rgba(140, 122, 196, 0.2)',
  wind: 'rgba(101, 162, 184, 0.2)',
  missing: 'transparent',
};

const iconFor = (mood: GroveWeatherMood, condition: string): React.ComponentProps<typeof Ionicons>['name'] => {
  if (mood === 'frost') return 'snow-outline';
  if (mood === 'storm') return 'thunderstorm-outline';
  if (mood === 'rain' || condition === 'rain') return 'rainy-outline';
  if (mood === 'wind') return 'flag-outline';
  if (mood === 'heat' || condition === 'clear') return 'sunny-outline';
  if (condition === 'partly') return 'partly-sunny-outline';
  return 'cloud-outline';
};

/** Grove weather hero — mirrors web GroveWeatherCard mood skies + big temp. */
const GroveWeatherCard: React.FC<Props> = ({
  fieldWeather,
  snapshot,
  fieldName,
  scopeNote,
  onPress,
  embedded = false,
  compact = false,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const { colors, isDark, fontScaleMultiplier } = useTheme();
  const view = presentGroveWeather({ field: fieldWeather, snapshot });
  const [skyTop, skyBottom] = (isDark ? moodSkyDark : moodSkyLight)[view.mood];
  const ink = colors.textPrimary;
  const muted = colors.textSecondary;
  const range =
    view.low != null && view.high != null ? `${view.low}–${view.high}°` : null;
  const updated =
    view.updatedAt && !Number.isNaN(view.updatedAt.getTime())
      ? view.updatedAt.toLocaleTimeString(i18n.language, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : null;

  const body = (
    <>
      <View style={[styles.skyBase, { backgroundColor: skyBottom }]} pointerEvents="none" />
      <View
        style={[
          styles.skyGlow,
          {
            backgroundColor: moodGlow[view.mood],
          },
        ]}
        pointerEvents="none"
      />
      <View style={[styles.skyWash, { backgroundColor: skyTop }]} pointerEvents="none" />

      <View style={styles.head}>
        <View style={styles.headText}>
          {!embedded && !compact ? (
            <Text style={[styles.kicker, { color: muted, fontSize: 11 * fontScaleMultiplier }]}>
              {t('weatherCard.label')}
            </Text>
          ) : null}
          {view.mood === 'missing' ? (
            <Text style={[styles.missing, { color: muted }]}>{t('weatherCard.reading.missing')}</Text>
          ) : (
            <>
              <Text
                style={[
                  styles.temp,
                  {
                    color: ink,
                    fontSize: (compact ? 34 : 44) * fontScaleMultiplier,
                    lineHeight: (compact ? 36 : 42) * fontScaleMultiplier,
                  },
                ]}
              >
                {view.temperature != null ? `${view.temperature}°` : '—'}
              </Text>
              {view.feelsLike != null ? (
                <Text style={[styles.feels, { color: muted }]}>
                  {t('weatherCard.feelsLike', { temp: view.feelsLike })}
                </Text>
              ) : null}
            </>
          )}
        </View>
        {view.mood !== 'missing' ? (
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: isDark ? 'rgba(244,246,242,0.06)' : 'rgba(28,33,29,0.05)',
                borderColor: isDark ? 'rgba(244,246,242,0.08)' : 'rgba(28,33,29,0.06)',
              },
            ]}
          >
            <Ionicons
              name={iconFor(view.mood, view.conditionKey)}
              size={compact ? 22 : 28}
              color={isDark ? colors.textPrimary : colors.charcoal}
            />
          </View>
        ) : null}
      </View>

      {view.mood !== 'missing' ? (
        <Text style={[styles.condition, { color: muted, fontSize: 14 * fontScaleMultiplier }]}>
          {[t(`weatherCard.condition.${view.conditionKey}`), range].filter(Boolean).join(' · ')}
        </Text>
      ) : null}

      {view.facts.length > 0 ? (
        <View style={styles.facts}>
          {view.facts.map(fact => (
            <View
              key={fact.id}
              style={[
                styles.fact,
                {
                  backgroundColor: fact.harsh
                    ? view.mood === 'frost'
                      ? 'rgba(170,210,235,0.18)'
                      : 'rgba(214,122,103,0.2)'
                    : isDark
                      ? 'rgba(244,246,242,0.08)'
                      : 'rgba(28,33,29,0.06)',
                },
              ]}
            >
              <Text
                style={[
                  styles.factText,
                  {
                    color: fact.harsh
                      ? view.mood === 'frost'
                        ? colors.frost
                        : colors.error
                      : ink,
                    fontSize: 12 * fontScaleMultiplier,
                  },
                ]}
              >
                {t(`weatherCard.${fact.labelKey}`, fact.params as Record<string, unknown>)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {view.mood !== 'missing' && !compact ? (
        <Text
          style={[
            styles.reading,
            {
              color: colors.textPrimary,
              fontSize: 15 * fontScaleMultiplier,
            },
          ]}
          numberOfLines={2}
        >
          {t(`weatherCard.${view.readingKey}`)}
        </Text>
      ) : null}

      {!embedded && view.mood !== 'missing' ? (
        <GroveWeekForecast fieldWeather={fieldWeather} />
      ) : null}

      {scopeNote || fieldName || updated ? (
        <Text style={[styles.meta, { color: muted }]} numberOfLines={2}>
          {[
            scopeNote || fieldName || null,
            updated
              ? view.stale
                ? t('weatherCard.stale')
                : t('weatherCard.updated', { time: updated })
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
    </>
  );

  const cardStyle = [
    styles.card,
    compact && styles.cardCompact,
    {
      borderColor: isDark ? 'rgba(240,244,238,0.1)' : 'rgba(28,33,29,0.1)',
      ...(embedded ? {} : createElevation(colors, isDark ? 'md' : 'raised')),
    },
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('weatherCard.label')}
        style={({ pressed }) => [cardStyle, { opacity: pressed ? motion.pressOpacity : 1 }]}
      >
        {body}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{body}</View>;
};

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    minHeight: 168,
    gap: 6,
  },
  cardCompact: {
    minHeight: 120,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },
  skyBase: {
    ...StyleSheet.absoluteFillObject,
  },
  skyWash: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '55%',
    opacity: 0.85,
  },
  skyGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    zIndex: 1,
  },
  headText: { flex: 1, minWidth: 0 },
  kicker: {
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  temp: {
    fontWeight: '700',
    letterSpacing: -1.8,
  },
  feels: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  missing: {
    fontSize: 15,
    lineHeight: 22,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  condition: {
    zIndex: 1,
    lineHeight: 20,
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    zIndex: 1,
  },
  fact: {
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 28,
    justifyContent: 'center',
  },
  factText: {
    fontWeight: '600',
  },
  reading: {
    zIndex: 1,
    lineHeight: 22,
    marginTop: 2,
  },
  meta: {
    zIndex: 1,
    paddingTop: spacing.sm,
    ...typography.styles.caption,
  },
});

export default GroveWeatherCard;

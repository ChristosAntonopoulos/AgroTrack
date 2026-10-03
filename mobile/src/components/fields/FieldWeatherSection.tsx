import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { FieldWeather } from '../../services/geospatialService';
import type { FieldAttentionModel } from '../../utils/fieldOverviewAttention';
import {
  resolveWeatherImplication,
  weatherOutlookBuckets,
} from '../../utils/fieldWeatherImplication';
import { useTheme } from '../../context/ThemeContext';
import FieldOverviewCard from './FieldOverviewCard';

type Props = {
  weather: FieldWeather | null;
  loading?: boolean;
  error?: boolean;
  year: number;
  isHistoricalYear: boolean;
  allowRecommendation: boolean;
  attention?: FieldAttentionModel | null;
  nextTaskTitle?: string;
  onRetry?: () => void;
  onMoveTask?: () => void;
  onSeeCharts?: () => void;
};

/**
 * Weather implication + outlook only — the grove card lives in the weather tab hero.
 */
const FieldWeatherSection: React.FC<Props> = ({
  weather,
  loading,
  error,
  year,
  isHistoricalYear,
  allowRecommendation,
  attention,
  nextTaskTitle,
  onRetry,
  onMoveTask,
  onSeeCharts,
}) => {
  const { t } = useTranslation('fields');
  const { colors } = useTheme();

  const implication = useMemo(
    () => resolveWeatherImplication(weather, { allowRecommendation }),
    [weather, allowRecommendation]
  );
  const outlook = useMemo(() => weatherOutlookBuckets(weather), [weather]);

  if (loading && !weather) {
    return (
      <FieldOverviewCard>
        <ActivityIndicator color={colors.primary} />
      </FieldOverviewCard>
    );
  }

  if (error || !weather) {
    return (
      <FieldOverviewCard>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{t('weather.unavailable')}</Text>
        {onRetry ? (
          <Pressable onPress={onRetry} hitSlop={4}>
            <Text style={[styles.link, { color: colors.primary }]}>{t('weather.retry')}</Text>
          </Pressable>
        ) : null}
      </FieldOverviewCard>
    );
  }

  const implicationText =
    implication.code === 'ok' && nextTaskTitle
      ? t('weather.implication.okNamed', { task: nextTaskTitle })
      : t(implication.textKey);

  const showMove =
    allowRecommendation && attention?.kind === 'weatherReschedule' && Boolean(onMoveTask);

  return (
    <FieldOverviewCard>
      {isHistoricalYear ? (
        <Text style={[styles.note, { color: colors.textTertiary }]}>
          {t('weather.notThatYear', { year })}
        </Text>
      ) : null}

      <Text style={[styles.implication, { color: colors.textSecondary }]}>{implicationText}</Text>

      {outlook.length > 0 ? (
        <View style={styles.outlook}>
          {outlook.map((bucket) => (
            <View key={bucket.key} style={styles.outlookRow}>
              <Text style={[styles.outlookLabel, { color: colors.textTertiary }]}>
                {t(`weather.outlook.${bucket.key}`)}
              </Text>
              <Text style={[styles.outlookValue, { color: colors.textPrimary }]}>
                {t('weather.rainAmount', { mm: bucket.mm.toFixed(1) })}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {showMove ? (
        <Pressable
          onPress={onMoveTask}
          style={[styles.moveBtn, { backgroundColor: colors.primaryLight, borderColor: colors.oliveBorder }]}
          hitSlop={4}
        >
          <Text style={[styles.moveText, { color: colors.primary }]}>
            {t('overview.attention.moveTask')}
          </Text>
        </Pressable>
      ) : null}

      {onSeeCharts ? (
        <Pressable onPress={onSeeCharts} hitSlop={4}>
          <Text style={[styles.link, { color: colors.primary }]}>{t('weather.seeCharts')}</Text>
        </Pressable>
      ) : null}
    </FieldOverviewCard>
  );
};

const styles = StyleSheet.create({
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  note: {
    fontSize: 13,
    fontWeight: '500',
  },
  implication: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  link: {
    fontWeight: '700',
    fontSize: 14,
  },
  outlook: {
    gap: 6,
  },
  outlookRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  outlookLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  outlookValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  moveBtn: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  moveText: {
    fontWeight: '700',
    fontSize: 13,
  },
});

export default FieldWeatherSection;

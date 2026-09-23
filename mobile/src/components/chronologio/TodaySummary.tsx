import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useCaptureOptional } from '../../context/CaptureContext';
import { radii, spacing } from '../../theme';
import GroveWeatherCard from '../weather/GroveWeatherCard';
import { openHarvestCampaign } from '../../navigation/intents';
import type { RootStackParamList } from '../../navigation/types';
import type { useTodaySummary } from '../../chronologio/useTodaySummary';

type TodayBundle = ReturnType<typeof useTodaySummary>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  today: TodayBundle;
  fieldId?: string;
  weatherScopeNote?: string;
  onOpenWeather?: () => void;
};

const TodaySummary: React.FC<Props> = ({ today, fieldId, weatherScopeNote, onOpenWeather }) => {
  const { t, i18n } = useTranslation(['chronologio', 'today', 'fields']);
  const { colors, tapMin } = useTheme();
  const navigation = useNavigation<Nav>();
  const capture = useCaptureOptional();
  const dateLabel = new Date().toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const runAttention = () => {
    const item = today.attention;
    if (item.action === 'open_task' && item.taskId) {
      navigation.navigate('TaskDetail', { taskId: item.taskId });
      return;
    }
    if (item.action === 'tasks') {
      navigation.navigate('Main', { screen: 'Tasks' });
      return;
    }
    if (item.action === 'schedule') {
      capture?.openCapture({ fieldId: item.fieldId || fieldId, preferredType: 'work' });
      return;
    }
    if (item.action === 'weather') {
      onOpenWeather?.();
      return;
    }
    if (item.action === 'harvest_evening') {
      openHarvestCampaign(navigation, { evening: true });
      return;
    }
    if (item.action === 'harvest_add') {
      openHarvestCampaign(navigation, { add: true });
      return;
    }
    capture?.openCapture({ fieldId: item.fieldId || fieldId });
  };

  const calm = today.attention.kind === 'calm';
  const iconName: React.ComponentProps<typeof Ionicons>['name'] =
    today.attention.kind === 'warning' ? 'warning-outline' : calm ? 'leaf-outline' : 'checkbox-outline';

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.attention,
          {
            backgroundColor: colors.surface,
            borderColor: today.attention.kind === 'warning' ? colors.warning : colors.borderLight,
          },
        ]}
      >
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          {t('chronologio:todayCard.heading', { date: dateLabel })}
        </Text>
        <View style={styles.copy}>
          <Ionicons name={iconName} size={18} color={today.attention.kind === 'warning' ? colors.warning : colors.primary} />
          <View style={{ flex: 1 }}>
            {calm ? (
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('chronologio:todayCard.allClear')}
              </Text>
            ) : (
              <>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {t(today.attention.titleKey, today.attention.titleParams)}
                </Text>
                <Text style={[styles.reason, { color: colors.textSecondary }]}>
                  {t(today.attention.reasonKey, today.attention.reasonParams)}
                </Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.actions}>
          {calm ? null : (
            <Pressable
              onPress={runAttention}
              style={[
                styles.btn,
                { backgroundColor: colors.primary, minHeight: Math.max(tapMin, 40) },
              ]}
            >
              <Text style={[styles.btnText, { color: colors.onOlive }]}>
                {today.attention.action === 'open_task' || today.attention.action === 'tasks'
                  ? t('chronologio:living.openTask')
                  : today.attention.action === 'weather'
                    ? t('chronologio:todayCard.seeConditions')
                    : today.attention.action === 'harvest_evening'
                      ? t('fields:harvestCampaign.today.close')
                      : today.attention.action === 'harvest_add'
                        ? t('fields:harvestCampaign.today.add')
                        : t('chronologio:todayCard.scheduleCheck')}
              </Text>
            </Pressable>
          )}
          {today.work.length > 0 ? (
            <Pressable
              onPress={() => navigation.navigate('Main', { screen: 'Tasks' })}
              style={[
                styles.btn,
                {
                  backgroundColor: colors.surfaceMuted,
                  minHeight: Math.max(tapMin, 40),
                },
              ]}
            >
              <Text style={[styles.btnText, { color: colors.textPrimary }]}>
                {t('chronologio:todayCard.workCount', { count: today.work.length })}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <GroveWeatherCard
        compact
        fieldWeather={today.fieldWeather}
        snapshot={today.weather}
        fieldName={weatherScopeNote ? undefined : today.weatherField?.name}
        scopeNote={weatherScopeNote}
        onPress={onOpenWeather}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
  attention: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  date: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2, textTransform: 'capitalize' },
  copy: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title: { fontSize: 17, fontWeight: '700', lineHeight: 22 },
  reason: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  btn: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  btnText: { fontWeight: '700', fontSize: 13 },
});

export default TodaySummary;

import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { useTasks } from '../hooks/useTasks';
import { useRefresh } from '../hooks/useRefresh';
import { useDashboardWeather } from '../hooks/useDashboardWeather';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import Section from '../components/layout/Section';
import LoadingSpinner from '../components/LoadingSpinner';
import Card from '../components/ui/Card';
import AlertBanner from '../components/ui/AlertBanner';
import TutorialOverlay, { TutorialStep } from '../components/TutorialOverlay';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { formatLocaleDate } from '../utils/formatters';
import { createElevation } from '../theme/elevation';
import { isTaskOverdue } from '../utils/taskListUtils';
import { getFieldService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { harvestFocusForPhase, pickNextHarvestWork } from '../utils/harvestUtils';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const openDirections = (lat: number, lng: number) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  Linking.openURL(url);
};

const TodayScreen = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { isEveryday, tapMin, fontScaleMultiplier, everydayTutorialSeen, markEverydayTutorialSeen } = usePreferences();
  const { t, i18n } = useTranslation(['today', 'common', 'fields', 'tutorial']);
  const navigation = useNavigation<Nav>();
  const { tasks, fields, loading, refresh } = useTasks();
  const { refreshing, onRefresh } = useRefresh(refresh);
  const [allFields, setAllFields] = useState<Field[]>([]);
  const { weather } = useDashboardWeather(allFields.length > 0 ? allFields : Object.values(fields));

  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (!user) return;
    getFieldService()
      .getFields(user.id, user.role)
      .then(setAllFields)
      .catch(() => setAllFields([]));
  }, [user]);

  useEffect(() => {
    if (isEveryday && !everydayTutorialSeen && !loading) {
      setShowTutorial(true);
    }
  }, [isEveryday, everydayTutorialSeen, loading]);

  const everydaySteps: TutorialStep[] = [
    {
      id: 'today-welcome',
      titleKey: 'everyday.step1.title',
      bodyKey: 'everyday.step1.body',
    },
    {
      id: 'next-action',
      titleKey: 'everyday.step2.title',
      bodyKey: 'everyday.step2.body',
    },
    {
      id: 'more-menu',
      titleKey: 'everyday.step3.title',
      bodyKey: 'everyday.step3.body',
    },
  ];

  const handleTutorialComplete = async () => {
    await markEverydayTutorialSeen();
    setShowTutorial(false);
  };

  const handleTutorialSkip = async () => {
    await markEverydayTutorialSeen();
    setShowTutorial(false);
  };

  const myOpenTasks = useMemo(() => {
    if (!user) return [];
    return tasks.filter((task) => task.status !== 'completed');
  }, [tasks, user]);

  const sortedOpen = useMemo(() => {
    const today = startOfDay(new Date());
    const list = [...myOpenTasks];
    list.sort((a, b) => {
      const ad = a.scheduledEnd ? new Date(a.scheduledEnd).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.scheduledEnd ? new Date(b.scheduledEnd).getTime() : Number.POSITIVE_INFINITY;
      const aOver = a.scheduledEnd ? new Date(a.scheduledEnd) < today : false;
      const bOver = b.scheduledEnd ? new Date(b.scheduledEnd) < today : false;
      if (aOver !== bOver) return aOver ? -1 : 1;
      return ad - bd;
    });
    return list;
  }, [myOpenTasks]);

  const nextTask = sortedOpen[0];
  const following = sortedOpen.slice(1, isEveryday ? 4 : 8);

  const routeFields = useMemo(() => {
    const fieldIds = [...new Set(sortedOpen.map((tk) => tk.fieldId))];
    return fieldIds.map((id) => fields[id]).filter(Boolean).slice(0, 3);
  }, [sortedOpen, fields]);

  const overdueCount = useMemo(
    () => sortedOpen.filter((tk) => isTaskOverdue(tk)).length,
    [sortedOpen]
  );

  const nextHarvest = useMemo(
    () => pickNextHarvestWork(sortedOpen, allFields),
    [sortedOpen, allFields]
  );

  const weatherLine = useMemo(() => {
    if (!weather) return null;
    if (weather.frostLevel && weather.frostLevel !== 'None') {
      return t('fields:weather.adviceFrost');
    }
    if (weather.rainForecast24hMm != null && weather.rainForecast24hMm >= 0.5) {
      return t('fields:weather.adviceRain');
    }
    return null;
  }, [weather, t]);

  if (loading && tasks.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <ScreenLayout
      scroll
      refreshControl={{ refreshing, onRefresh }}
      contentContainerStyle={styles.content}
    >
      <ScreenHeader title={t('title')} subtitle={t('subtitle')} />

      {overdueCount > 0 ? (
        <View style={styles.bannerWrap}>
          <AlertBanner
            variant="error"
            icon="alert-circle"
            message={t('overdueSafety', { count: overdueCount })}
            onPress={() => navigation.navigate('Main', { screen: 'Tasks' })}
          />
        </View>
      ) : null}

      {weatherLine ? (
        <View style={styles.bannerWrap}>
          <AlertBanner
            variant="warning"
            icon={weather?.frostLevel && weather.frostLevel !== 'None' ? 'snow' : 'rainy'}
            message={weatherLine}
          />
        </View>
      ) : null}

      {nextHarvest ? (
        <TouchableOpacity
          style={[
            styles.harvestCta,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.primaryDark,
              minHeight: Math.max(tapMin + 8, 64),
              ...createElevation(colors, 'sm'),
            },
          ]}
          onPress={() => {
            if (nextHarvest.kind === 'task') {
              navigation.navigate('TaskDetail', { taskId: nextHarvest.task.id });
              return;
            }
            navigation.navigate('FieldDetail', {
              fieldId: nextHarvest.fieldId,
              focus: harvestFocusForPhase(nextHarvest.phase),
            });
          }}
          accessibilityRole="button"
        >
          <Ionicons name="basket-outline" size={22} color={colors.primaryDark} />
          <Text
            style={{
              color: colors.primaryDark,
              fontWeight: '800',
              flex: 1,
              fontSize: 17 * fontScaleMultiplier,
            }}
          >
            {nextHarvest.kind === 'task'
              ? nextHarvest.task.title
              : t(`nextHarvest.${nextHarvest.phase}`, { defaultValue: t('writeHarvest') })}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={colors.primaryDark} />
        </TouchableOpacity>
      ) : null}

      {nextTask ? (
        <TouchableOpacity
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.primaryDark,
              minHeight: Math.max(tapMin * 2.5, 128),
              ...createElevation(colors, 'md'),
            },
          ]}
          onPress={() => navigation.navigate('TaskDetail', { taskId: nextTask.id })}
          accessibilityRole="button"
          accessibilityLabel={`${t('startNext')}: ${nextTask.title}`}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.heroLabel,
              { color: colors.textInverse + 'CC', fontSize: 13 * fontScaleMultiplier },
            ]}
          >
            {t('startNextHint')}
          </Text>
          <Text
            style={[
              styles.heroTitle,
              { color: colors.textInverse, fontSize: 22 * fontScaleMultiplier },
            ]}
            numberOfLines={2}
          >
            {nextTask.title}
          </Text>
          {fields[nextTask.fieldId]?.name ? (
            <View style={styles.heroMeta}>
              <Ionicons name="leaf-outline" size={16} color={colors.textInverse} />
              <Text
                style={{
                  color: colors.textInverse,
                  fontWeight: '600',
                  fontSize: 15 * fontScaleMultiplier,
                }}
              >
                {fields[nextTask.fieldId].name}
              </Text>
            </View>
          ) : null}
          <View
            style={[
              styles.heroCta,
              { backgroundColor: colors.textInverse + '25', minHeight: tapMin },
            ]}
          >
            <Text
              style={{
                color: colors.textInverse,
                fontWeight: '800',
                fontSize: 17 * fontScaleMultiplier,
              }}
            >
              {t('startNext')}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={colors.textInverse} />
          </View>
        </TouchableOpacity>
      ) : (
        <Card variant="muted" style={styles.emptyHero}>
          <Text
            style={[
              styles.emptyTitle,
              { color: colors.textPrimary, fontSize: 18 * fontScaleMultiplier },
            ]}
          >
            {t('noTasksTitle')}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 15 * fontScaleMultiplier }}>
            {t('noTasksDescription')}
          </Text>
        </Card>
      )}

      {routeFields.length > 0 ? (
        <Section title={t('fieldsNeedYou')}>
          {routeFields.map((field) => (
            <TouchableOpacity
              key={field.id}
              style={[
                styles.fieldChip,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.borderLight,
                  minHeight: tapMin,
                  ...createElevation(colors, 'sm'),
                },
              ]}
              onPress={() => navigation.navigate('FieldDetail', { fieldId: field.id })}
              accessibilityRole="button"
            >
              <Ionicons name="leaf" size={18} color={colors.primaryDark} />
              <Text
                style={{
                  color: colors.textPrimary,
                  fontWeight: '700',
                  flex: 1,
                  fontSize: 16 * fontScaleMultiplier,
                }}
                numberOfLines={1}
              >
                {field.name}
              </Text>
              {field.latitude != null && field.longitude != null ? (
                <TouchableOpacity
                  onPress={() => openDirections(field.latitude!, field.longitude!)}
                  hitSlop={12}
                  accessibilityLabel="Maps"
                >
                  <Ionicons name="navigate-outline" size={20} color={colors.primaryDark} />
                </TouchableOpacity>
              ) : null}
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </Section>
      ) : null}

      {following.length > 0 ? (
        <Section title={t('recommendedTasks')}>
          {following.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[
                styles.taskRow,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.borderLight,
                  minHeight: tapMin,
                  ...createElevation(colors, 'sm'),
                },
              ]}
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
            >
              <Ionicons name="ellipse-outline" size={14} color={colors.primaryDark} />
              <Text
                style={{
                  color: colors.textPrimary,
                  fontWeight: '600',
                  flex: 1,
                  fontSize: 15 * fontScaleMultiplier,
                }}
              >
                {task.title}
              </Text>
              {task.scheduledEnd ? (
                <Text style={{ color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier }}>
                  {formatLocaleDate(new Date(task.scheduledEnd), i18n.language)}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </Section>
      ) : null}

      <TouchableOpacity
        style={[styles.agendaLink, { minHeight: tapMin }]}
        onPress={() => navigation.navigate('Main', { screen: 'Calendar' })}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.primaryDark} />
        <Text
          style={{
            color: colors.primaryDark,
            fontWeight: '700',
            fontSize: 15 * fontScaleMultiplier,
          }}
        >
          {t('thisWeek')}
        </Text>
      </TouchableOpacity>

      <TutorialOverlay
        visible={showTutorial}
        steps={everydaySteps}
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialSkip}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: spacing['2xl'] },
  bannerWrap: { paddingHorizontal: spacing.base, marginBottom: spacing.sm },
  heroCard: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.lg,
    borderRadius: 16,
    padding: spacing.base,
    justifyContent: 'center',
  },
  emptyHero: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.lg,
    padding: spacing.base,
  },
  heroLabel: { ...typography.styles.caption, marginBottom: spacing.xs },
  heroTitle: { ...typography.styles.h3, fontWeight: '800', marginBottom: spacing.sm },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  emptyTitle: { fontWeight: '700', marginBottom: 4 },
  fieldChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  harvestCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
  },
  agendaLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.base,
    marginTop: spacing.md,
  },
});

export default TodayScreen;

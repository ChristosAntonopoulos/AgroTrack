import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Linking, Alert } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import { Lifecycle } from '../services/lifecycleService';
import { Activity } from '../services/activityService';
import {
  getFieldService,
  getTaskService,
  getLifecycleService,
  getActivityService,
} from '../services/serviceFactory';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ScreenLayout from '../components/layout/ScreenLayout';
import Section from '../components/layout/Section';
import OverviewMetricsStrip from '../components/layout/OverviewMetricsStrip';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import QuickActionRow from '../components/ui/QuickActionRow';
import InfoRow from '../components/ui/InfoRow';
import AlertBanner from '../components/ui/AlertBanner';
import LifecycleStageStepper from '../components/domain/LifecycleStageStepper';
import AgendaTaskRow from '../components/domain/AgendaTaskRow';
import WeatherWidget from '../components/domain/WeatherWidget';
import ActivityTimeline from '../components/domain/ActivityTimeline';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { weatherService, WeatherAlert, WeatherData } from '../services/weatherService';
import { typography, spacing } from '../theme';
import { createElevation } from '../theme/elevation';
import { formatLocaleDate } from '../utils/formatters';
import { fieldGradientColors, fieldHealthStatus, getAgendaTasks } from '../utils/dashboardUtils';
import { normalizeStage } from '../utils/lifecycleUtils';
import { isTaskOverdue } from '../utils/taskListUtils';
import { RootStackParamList } from '../navigation/types';
import { OverviewMetricCardProps } from '../components/ui/OverviewMetricCard';

type Route = RouteProp<RootStackParamList, 'FieldDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'FieldDetail'>;

const FieldDetailScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { fieldId } = route.params;
  const { isFieldOwner } = useAuth();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation(['fields', 'common', 'dashboard', 'tasks']);

  const [field, setField] = useState<Field | null>(null);
  const [lifecycle, setLifecycle] = useState<Lifecycle | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [producerIds, setProducerIds] = useState<string[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);

  const loadFieldDetails = useCallback(async () => {
    try {
      setLoading(true);
      const [fieldData, lifecycleData, tasksData] = await Promise.all([
        getFieldService().getField(fieldId),
        getLifecycleService().getLifecycle(fieldId),
        getTaskService().getTasksByField(fieldId),
      ]);

      setField(fieldData);
      setLifecycle(lifecycleData);
      setTasks(tasksData);

      const producers =
        fieldData.assignedProducerIds?.length
          ? fieldData.assignedProducerIds
          : await getFieldService().getProducers(fieldId).catch(() => []);
      setProducerIds(producers);

      try {
        const acts = await getActivityService().getActivities(fieldId, 10);
        setActivities(acts);
      } catch {
        setActivities([]);
      }

      if (fieldData.latitude != null && fieldData.longitude != null) {
        const [wx, alerts] = await Promise.all([
          weatherService.getCurrentWeather(fieldData.latitude, fieldData.longitude),
          weatherService.getWeatherAlerts(fieldData.latitude, fieldData.longitude).catch(() => []),
        ]);
        setWeather(wx);
        setWeatherAlerts(alerts);
      } else {
        setWeather(null);
        setWeatherAlerts([]);
      }
    } catch (error) {
      console.error('Error loading field details:', error);
      setField(null);
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  useEffect(() => {
    loadFieldDetails();
  }, [loadFieldDetails]);

  const openTasks = useMemo(
    () => tasks.filter(tk => tk.status !== 'completed'),
    [tasks]
  );
  const overdueCount = useMemo(
    () => openTasks.filter(tk => isTaskOverdue(tk)).length,
    [openTasks]
  );
  const agendaTasks = useMemo(() => getAgendaTasks(tasks, 5), [tasks]);
  const completedCount = tasks.length - openTasks.length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const currentStage =
    lifecycle?.currentStage ?? field?.currentLifecycleStage ?? 'dormancy';
  const currentYear = lifecycle?.currentYear ?? field?.currentLifecycleYear ?? 'low';

  const handleLifecycleAction = async (action: 'advance' | 'revert' | 'progress' | 'init') => {
    try {
      setLifecycleLoading(true);
      let updated: Lifecycle | null = null;
      if (action === 'advance') updated = await getLifecycleService().advanceStage(fieldId);
      else if (action === 'revert') updated = await getLifecycleService().revertStage(fieldId);
      else if (action === 'progress') updated = await getLifecycleService().progressCycle(fieldId);
      else updated = await getLifecycleService().initializeLifecycle(fieldId);
      setLifecycle(updated);
      const refreshed = await getFieldService().getField(fieldId);
      setField(refreshed);
    } catch (error: any) {
      Alert.alert(t('fields:lifecycle'), error.message);
    } finally {
      setLifecycleLoading(false);
    }
  };

  const goTab = (screen: 'Tasks' | 'Calendar') => {
    const params = { fieldId, date: new Date().toISOString() };
    if (screen === 'Tasks') {
      navigation.navigate('Main', { screen: 'Tasks', params: { fieldId } });
    } else {
      navigation.navigate('Main', { screen: 'Calendar', params });
    }
  };

  const openMaps = () => {
    if (field?.latitude != null && field?.longitude != null) {
      Linking.openURL(`https://www.google.com/maps?q=${field.latitude},${field.longitude}`);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  if (!field) {
    return (
      <ScreenLayout padded style={styles.centered}>
        <EmptyState
          icon={<Ionicons name="alert-circle-outline" size={36} color={colors.error} />}
          title={t('fields:notFound')}
          action={{ label: t('common:back'), onPress: () => navigation.goBack() }}
        />
      </ScreenLayout>
    );
  }

  const [gradStart, gradEnd] = fieldGradientColors(field.id);
  const health = fieldHealthStatus(field, openTasks.length, overdueCount > 0);
  const hasGps = field.latitude != null && field.longitude != null;

  const glanceMetrics: OverviewMetricCardProps[] = [
    {
      icon: 'resize-outline',
      value: `${field.area} ha`,
      label: t('fields:areaShort'),
      subtitle: field.variety ?? field.groundType ?? t('fields:hectaresUnit'),
      accentColor: colors.primary,
    },
    {
      icon: 'time-outline',
      value: field.treeAge ?? '—',
      label: t('fields:treeAge'),
      subtitle: field.treeAge ? t('fields:yearsUnit') : t('fields:notSet'),
      accentColor: colors.info,
    },
    {
      icon: 'clipboard-outline',
      value: openTasks.length,
      label: t('fields:openTasks'),
      subtitle:
        overdueCount > 0
          ? t('fields:overdueOnField', { count: overdueCount })
          : `${completionRate}% ${t('fields:complete')}`,
      subtitleColor: overdueCount > 0 ? colors.error : colors.textTertiary,
      accentColor: overdueCount > 0 ? colors.error : colors.warning,
      onPress: () => goTab('Tasks'),
    },
    {
      icon: 'people-outline',
      value: producerIds.length,
      label: t('fields:producers'),
      subtitle: t('fields:assigned'),
      accentColor: colors.secondary,
    },
    {
      icon: field.irrigationStatus ? 'water' : 'water-outline',
      value: field.irrigationStatus ? t('common:yes') : t('common:no'),
      label: t('fields:irrigation'),
      subtitle: field.irrigationStatus ? t('fields:irrigated') : t('fields:dry'),
      accentColor: field.irrigationStatus ? colors.info : colors.textTertiary,
    },
    {
      icon: 'leaf-outline',
      value: t(`common:lifecycleYear.${currentYear}`),
      label: t('fields:currentStage'),
      subtitle: t(`common:lifecycleStage.${normalizeStage(currentStage)}`),
      accentColor: colors.success,
    },
  ];

  const quickActions = [
    {
      id: 'tasks',
      icon: 'list-outline' as const,
      label: t('fields:viewTasks'),
      onPress: () => goTab('Tasks'),
    },
    {
      id: 'calendar',
      icon: 'calendar-outline' as const,
      label: t('fields:viewCalendar'),
      onPress: () => goTab('Calendar'),
    },
    ...(hasGps
      ? [{ id: 'maps', icon: 'map-outline' as const, label: t('fields:openMaps'), onPress: openMaps }]
      : []),
    ...(isFieldOwner()
      ? [
          {
            id: 'edit',
            icon: 'create-outline' as const,
            label: t('fields:editField'),
            onPress: () => navigation.navigate('FieldForm', { fieldId }),
          },
        ]
      : []),
  ];

  return (
    <ScreenLayout scroll contentContainerStyle={styles.content}>
      <View
        style={[
          styles.hero,
          { backgroundColor: gradStart, ...createElevation(colors, 'md') },
        ]}
      >
        <View style={[styles.heroOverlay, { backgroundColor: gradEnd + '99' }]} />
        <View style={styles.heroBody}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroName, { color: colors.textInverse }]}>{field.name}</Text>
              {field.variety ? (
                <Text style={[styles.heroVariety, { color: colors.textInverse + 'CC' }]}>
                  {field.variety}
                </Text>
              ) : null}
            </View>
            <View
              style={[
                styles.healthBadge,
                { backgroundColor: health === 'healthy' ? colors.success : colors.warning },
              ]}
            >
              <Text style={[styles.healthText, { color: colors.textInverse }]}>
                {health === 'healthy' ? t('dashboard:fieldHealthy') : t('dashboard:fieldMonitor')}
              </Text>
            </View>
          </View>
          <View style={styles.heroMeta}>
            <View style={[styles.yearPill, { backgroundColor: colors.textInverse + '22' }]}>
              <Text style={[styles.yearText, { color: colors.textInverse }]}>
                {t(`common:lifecycleYear.${currentYear}`)}
              </Text>
            </View>
            <Text style={[styles.stageText, { color: colors.textInverse }]}>
              {t(`common:lifecycleStage.${normalizeStage(currentStage)}`)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.quickRow}>
        <QuickActionRow actions={quickActions} />
      </View>

      <View style={styles.glanceBlock}>
        <Text style={[styles.glanceTitle, { color: colors.textPrimary }]}>
          {t('fields:atAGlance')}
        </Text>
        <OverviewMetricsStrip metrics={glanceMetrics} embedded />
      </View>

      {overdueCount > 0 ? (
        <View style={styles.bannerWrap}>
          <AlertBanner
            variant="error"
            icon="alert-circle"
            message={t('fields:overdueOnField', { count: overdueCount })}
            onPress={() => goTab('Tasks')}
          />
        </View>
      ) : null}

      {weatherAlerts.map((alert, index) => (
        <View key={`${alert.type}-${index}`} style={styles.bannerWrap}>
          <AlertBanner
            variant="warning"
            icon="warning"
            message={alert.message}
          />
        </View>
      ))}

      {hasGps ? (
        <Section title={t('fields:weatherLocation')}>
          <WeatherWidget weather={weather} />
          <Card variant="outlined" style={styles.gpsCard}>
            <InfoRow
              icon="location-outline"
              label={t('fields:coordinates')}
              value={`${field.latitude!.toFixed(4)}, ${field.longitude!.toFixed(4)}`}
              showDivider={false}
            />
            <Button
              title={t('fields:openMaps')}
              onPress={openMaps}
              variant="outline"
              size="small"
              style={styles.mapsBtn}
            />
          </Card>
        </Section>
      ) : null}

      <Section title={t('fields:lifecycle')}>
        <Card>
          <View style={styles.lifecycleHeader}>
            <Text style={[styles.lifecycleTitle, { color: colors.textPrimary }]}>
              {t(`common:lifecycleYear.${currentYear}`)}
            </Text>
            <Text style={[styles.lifecycleSub, { color: colors.textSecondary }]}>
              {t('fields:currentStage')}: {t(`common:lifecycleStage.${normalizeStage(currentStage)}`)}
            </Text>
          </View>
          <LifecycleStageStepper currentStage={currentStage} />
          {lifecycle ? (
            <View style={[styles.dateRow, { borderTopColor: colors.borderLight }]}>
              <DateBlock
                label={t('fields:cycleStart')}
                value={formatLocaleDate(new Date(lifecycle.cycleStartDate), i18n.language)}
                colors={colors}
              />
              {lifecycle.lastProgressionDate ? (
                <DateBlock
                  label={t('fields:lastProgression')}
                  value={formatLocaleDate(new Date(lifecycle.lastProgressionDate), i18n.language)}
                  colors={colors}
                />
              ) : null}
            </View>
          ) : (
            <Text style={[styles.noLifecycle, { color: colors.textSecondary }]}>
              {t('fields:noLifecycleYet')}
            </Text>
          )}
        </Card>
      </Section>

      <Section title={t('fields:fieldDetails')}>
        <Card>
          <InfoRow icon="leaf-outline" label={t('fields:fieldName')} value={field.name} />
          {field.variety ? (
            <InfoRow icon="nutrition-outline" label={t('fields:variety')} value={field.variety} />
          ) : null}
          <InfoRow
            icon="resize-outline"
            label={t('fields:area')}
            value={`${field.area} ${t('fields:hectaresUnit')}`}
          />
          {field.groundType ? (
            <InfoRow icon="earth-outline" label={t('fields:groundType')} value={field.groundType} />
          ) : null}
          <InfoRow
            icon="water-outline"
            label={t('fields:irrigation')}
            value={field.irrigationStatus ? t('fields:irrigated') : t('fields:dry')}
          />
          {field.treeAge ? (
            <InfoRow
              icon="time-outline"
              label={t('fields:treeAge')}
              value={`${field.treeAge} ${t('fields:yearsUnit')}`}
            />
          ) : null}
          <InfoRow
            icon="calendar-outline"
            label={t('fields:created')}
            value={formatLocaleDate(new Date(field.createdAt), i18n.language)}
          />
          <InfoRow
            icon="refresh-outline"
            label={t('fields:lastUpdated')}
            value={formatLocaleDate(new Date(field.updatedAt), i18n.language)}
            showDivider={false}
          />
        </Card>
      </Section>

      <Section
        title={t('fields:upcomingTasks')}
        actionLabel={tasks.length > 0 ? t('fields:viewAllTasks', { count: tasks.length }) : undefined}
        onActionPress={tasks.length > 0 ? () => goTab('Tasks') : undefined}
      >
        {agendaTasks.length > 0 ? (
          agendaTasks.map(task => (
            <AgendaTaskRow
              key={task.id}
              task={task}
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
            />
          ))
        ) : (
          <EmptyState
            icon={<Ionicons name="clipboard-outline" size={32} color={colors.textTertiary} />}
            title={t('fields:noOpenTasks')}
            description={t('fields:noOpenTasksHint')}
            action={
              isFieldOwner()
                ? {
                    label: t('tasks:createTask'),
                    onPress: () => navigation.navigate('CreateTask', { fieldId }),
                  }
                : undefined
            }
          />
        )}
      </Section>

      {activities.length > 0 ? (
        <Section title={t('fields:activity')}>
          <ActivityTimeline activities={activities} fieldNames={{ [field.id]: field.name }} />
        </Section>
      ) : null}

      {isFieldOwner() ? (
        <Section title={t('fields:manageField')}>
          <View style={styles.ownerActions}>
            {!lifecycle ? (
              <Button
                title={t('fields:initializeLifecycle')}
                onPress={() => handleLifecycleAction('init')}
                loading={lifecycleLoading}
              />
            ) : (
              <>
                <Button
                  title={t('fields:advanceStage')}
                  onPress={() => handleLifecycleAction('advance')}
                  loading={lifecycleLoading}
                />
                <Button
                  title={t('fields:revertStage')}
                  variant="outline"
                  onPress={() => handleLifecycleAction('revert')}
                  loading={lifecycleLoading}
                />
                <Button
                  title={t('fields:toggleYear')}
                  variant="outline"
                  onPress={() => handleLifecycleAction('progress')}
                  loading={lifecycleLoading}
                />
              </>
            )}
            <Button
              title={t('tasks:createTask')}
              variant="outline"
              onPress={() => navigation.navigate('CreateTask', { fieldId })}
            />
          </View>
        </Section>
      ) : null}
    </ScreenLayout>
  );
};

const DateBlock = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) => (
  <View style={styles.dateBlock}>
    <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>{label}</Text>
    <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  content: { paddingBottom: spacing['3xl'] },
  centered: { flex: 1, justifyContent: 'center' },
  hero: {
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 120,
  },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  heroBody: { padding: spacing.base, zIndex: 1 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  heroName: { ...typography.styles.h2, fontWeight: '700', fontSize: 22 },
  heroVariety: { ...typography.styles.bodySmall, marginTop: 2 },
  healthBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  healthText: { ...typography.styles.caption, fontWeight: '700', fontSize: 10 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  yearPill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 8 },
  yearText: { ...typography.styles.caption, fontWeight: '700', fontSize: 10 },
  stageText: { ...typography.styles.caption, fontWeight: '600' },
  "quickRow": { marginTop: spacing.md },
  glanceBlock: { marginTop: spacing.md, marginBottom: spacing.sm },
  glanceTitle: {
    ...typography.styles.h4,
    fontWeight: '700',
    fontSize: 18,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  bannerWrap: { paddingHorizontal: spacing.base, marginBottom: spacing.xs },
  gpsCard: { marginTop: spacing.md },
  mapsBtn: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  lifecycleHeader: { marginBottom: spacing.sm },
  lifecycleTitle: { ...typography.styles.body, fontWeight: '700' },
  lifecycleSub: { ...typography.styles.caption, marginTop: 2 },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  dateBlock: { flex: 1 },
  dateLabel: { ...typography.styles.caption, fontSize: 10 },
  dateValue: { ...typography.styles.bodySmall, fontWeight: '600', marginTop: 2 },
  noLifecycle: { ...typography.styles.caption, marginTop: spacing.sm },
  ownerActions: { gap: spacing.sm },
});

export default FieldDetailScreen;

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useRefresh } from '../hooks/useRefresh';
import { useTasks } from '../hooks/useTasks';
import { useFields } from '../hooks/useFields';
import { useDashboardWeather } from '../hooks/useDashboardWeather';
import { useRecentActivities } from '../hooks/useRecentActivities';
import ScreenLayout from '../components/layout/ScreenLayout';
import Section from '../components/layout/Section';
import OverviewMetricsStrip from '../components/layout/OverviewMetricsStrip';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertBanner from '../components/ui/AlertBanner';
import AgendaTaskRow from '../components/domain/AgendaTaskRow';
import DashboardFieldCard from '../components/domain/DashboardFieldCard';
import WeatherWidget from '../components/domain/WeatherWidget';
import ActivityTimeline from '../components/domain/ActivityTimeline';
import EmptyState from '../components/EmptyState';
import { spacing } from '../theme';
import { createElevation } from '../theme/elevation';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { formatLocaleDate } from '../utils/formatters';
import { isTaskOverdue } from '../utils/taskListUtils';
import {
  countFieldLocations,
  countTasksDueThisWeek,
  countHighPriorityDueWeek,
  getAgendaTasks,
} from '../utils/dashboardUtils';
import { OverviewMetricCardProps } from '../components/ui/OverviewMetricCard';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const DashboardScreen = () => {
  const { user, isFieldOwner } = useAuth();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation(['dashboard', 'common', 'nav']);
  const navigation = useNavigation<Nav>();
  const { stats, loading, refresh } = useDashboardStats();
  const { refreshing, onRefresh } = useRefresh(refresh);
  const { tasks } = useTasks();
  const { fields } = useFields();
  const { weather, loading: weatherLoading } = useDashboardWeather(fields);
  const { activities } = useRecentActivities(fields, tasks);

  const goTab = (
    screen: 'Fields' | 'Tasks' | 'Calendar',
    params?: MainTabParamList['Tasks'] | MainTabParamList['Calendar']
  ) => {
    if (screen === 'Fields') {
      navigation.navigate('Main', { screen: 'Fields' });
    } else if (screen === 'Tasks') {
      navigation.navigate('Main', { screen: 'Tasks', params: params as MainTabParamList['Tasks'] });
    } else {
      navigation.navigate('Main', { screen: 'Calendar', params: params as MainTabParamList['Calendar'] });
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard:greetingMorning');
    if (hour < 18) return t('dashboard:greetingAfternoon');
    return t('dashboard:greetingEvening');
  };

  const overdueCount = useMemo(
    () => tasks.filter(tk => tk.status !== 'completed' && isTaskOverdue(tk)).length,
    [tasks]
  );

  const pendingApproval = useMemo(
    () => tasks.filter(tk => tk.approvalStatus === 'pending'),
    [tasks]
  );

  const tasksDueWeek = useMemo(() => countTasksDueThisWeek(tasks), [tasks]);
  const highPriorityWeek = useMemo(() => countHighPriorityDueWeek(tasks), [tasks]);
  const locationCount = useMemo(() => countFieldLocations(fields), [fields]);
  const agendaTasks = useMemo(() => getAgendaTasks(tasks, 5), [tasks]);
  const topFields = useMemo(() => fields.slice(0, 3), [fields]);
  const needsAttentionCount = overdueCount + pendingApproval.length;

  const fieldNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    fields.forEach(f => {
      map[f.id] = f.name;
    });
    return map;
  }, [fields]);

  const taskFieldNames = useMemo(() => {
    const map: Record<string, string> = { ...fieldNamesMap };
    tasks.forEach(tk => {
      if (!map[tk.fieldId]) {
        const f = fields.find(x => x.id === tk.fieldId);
        if (f) map[tk.fieldId] = f.name;
      }
    });
    return map;
  }, [tasks, fields, fieldNamesMap]);

  const owner = isFieldOwner();

  const overviewMetrics = useMemo((): OverviewMetricCardProps[] => {
    if (!stats) return [];
    if (owner) {
      return [
        {
          icon: 'leaf',
          value: stats.totalFields || 0,
          label: t('dashboard:stats.fields'),
          subtitle: t('dashboard:stats.acrossLocations', { count: locationCount }),
          accentColor: colors.success,
          onPress: () => goTab('Fields'),
        },
        {
          icon: 'resize-outline',
          value: `${(stats.totalArea || 0).toFixed(1)} ha`,
          label: t('dashboard:stats.hectares'),
          subtitle: t('dashboard:stats.cultivated'),
          accentColor: colors.primary,
          onPress: () => goTab('Fields'),
        },
        {
          icon: 'clipboard-outline',
          value: tasksDueWeek,
          label: t('dashboard:stats.tasksDueWeek'),
          subtitle: t('dashboard:stats.highPriority'),
          subtitleColor: highPriorityWeek > 0 ? colors.warning : colors.textTertiary,
          accentColor: colors.warning,
          onPress: () => goTab('Tasks'),
        },
        {
          icon: 'alert-circle-outline',
          value: needsAttentionCount,
          label: t('dashboard:stats.needsAttention'),
          subtitle: t('dashboard:stats.actionRequired'),
          subtitleColor: needsAttentionCount > 0 ? colors.error : colors.textTertiary,
          accentColor: colors.error,
          onPress: () => goTab('Tasks'),
        },
      ];
    }
    return [
      {
        icon: 'clipboard-outline',
        value: stats.totalTasks || 0,
        label: t('dashboard:stats.total'),
        accentColor: colors.primary,
        onPress: () => goTab('Tasks'),
      },
      {
        icon: 'sync-outline',
        value: stats.inProgressTasks || 0,
        label: t('dashboard:stats.inProgress'),
        accentColor: colors.info,
        onPress: () => goTab('Tasks', { filter: 'in_progress' }),
      },
      {
        icon: 'alert-circle-outline',
        value: overdueCount,
        label: t('dashboard:overdue'),
        subtitle: t('dashboard:stats.actionRequired'),
        subtitleColor: overdueCount > 0 ? colors.error : colors.textTertiary,
        accentColor: colors.error,
        onPress: () => goTab('Tasks'),
      },
      {
        icon: 'calendar-outline',
        value: tasksDueWeek,
        label: t('dashboard:stats.tasksDueWeek'),
        accentColor: colors.warning,
        onPress: () => goTab('Calendar', { date: new Date().toISOString() }),
      },
    ];
  }, [stats, owner, locationCount, tasksDueWeek, highPriorityWeek, needsAttentionCount, overdueCount, colors, t]);

  if (loading && !stats) return <LoadingSpinner fullScreen />;
  if (!user || !stats) return null;

  const dateLabel = formatLocaleDate(new Date(), i18n.language, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const greeting = `${getGreeting()}${user.firstName ? `, ${user.firstName}` : ''}`;

  return (
    <View style={styles.root}>
      <OverviewMetricsStrip greeting={greeting} dateLabel={dateLabel} metrics={overviewMetrics} />

      <ScreenLayout
        scroll
        style={styles.flex}
        refreshControl={{ refreshing, onRefresh }}
        contentContainerStyle={styles.scrollContent}
      >
        {owner && overdueCount > 0 ? (
          <View style={styles.bannerSection}>
            <AlertBanner
              variant="error"
              icon="alert-circle"
              message={t('dashboard:overdueBanner', { count: overdueCount })}
              onPress={() => goTab('Tasks')}
            />
          </View>
        ) : null}

        {owner && pendingApproval.length > 0 ? (
          <View style={styles.bannerSection}>
            <AlertBanner
              variant="warning"
              icon="hourglass"
              message={t('dashboard:approvalBanner', { count: pendingApproval.length })}
              onPress={() => goTab('Tasks', { filter: 'approval' })}
            />
          </View>
        ) : null}

        <Section
          title={t('dashboard:todayThisWeek')}
          actionLabel={t('dashboard:viewAllTasks')}
          onActionPress={() => goTab('Tasks')}
        >
          {agendaTasks.length > 0 ? (
            agendaTasks.map(task => (
              <AgendaTaskRow
                key={task.id}
                task={task}
                fieldName={taskFieldNames[task.fieldId]}
                onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
              />
            ))
          ) : (
            <EmptyState
              icon={<Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />}
              title={t('dashboard:noUrgent')}
              description={t('dashboard:allClearHint')}
            />
          )}
        </Section>

        {owner && topFields.length > 0 ? (
          <Section
            title={t('dashboard:yourFields')}
            actionLabel={t('dashboard:seeAllFields')}
            onActionPress={() => goTab('Fields')}
          >
            {topFields.map(field => {
              const fieldTasks = tasks.filter(
                tk => tk.fieldId === field.id && tk.status !== 'completed'
              );
              const fieldOverdue = fieldTasks.some(tk => isTaskOverdue(tk));
              return (
                <DashboardFieldCard
                  key={field.id}
                  field={field}
                  openTaskCount={fieldTasks.length}
                  hasOverdue={fieldOverdue}
                  onPress={() => navigation.navigate('FieldDetail', { fieldId: field.id })}
                  onViewTasks={() => goTab('Tasks', { fieldId: field.id })}
                  onViewCalendar={() =>
                    goTab('Calendar', { fieldId: field.id, date: new Date().toISOString() })
                  }
                  onViewDetails={() => navigation.navigate('FieldDetail', { fieldId: field.id })}
                />
              );
            })}
          </Section>
        ) : null}

        {owner ? (
          <View style={styles.widgetRow}>
            <WeatherWidget weather={weather} loading={weatherLoading} />
            <ActivityTimeline activities={activities} fieldNames={fieldNamesMap} />
          </View>
        ) : null}
      </ScreenLayout>

      {owner ? (
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: colors.primaryDark, ...createElevation(colors, 'lg') },
          ]}
          onPress={() => navigation.navigate('CreateTask', {})}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={colors.textInverse} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: spacing['3xl'], paddingTop: spacing.xs },
  bannerSection: { paddingHorizontal: spacing.base, marginBottom: spacing.sm },
  widgetRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  fab: {
    position: 'absolute',
    right: spacing.base,
    bottom: spacing.base,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DashboardScreen;

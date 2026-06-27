import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import Section from '../components/layout/Section';
import LoadingSpinner from '../components/LoadingSpinner';
import Card from '../components/ui/Card';
import MetricTile from '../components/ui/MetricTile';
import QuickActionRow from '../components/ui/QuickActionRow';
import TaskCard from '../components/domain/TaskCard';
import FieldCard from '../components/domain/FieldCard';
import EmptyState from '../components/EmptyState';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { formatLocaleDate } from '../utils/formatters';
import { isTaskOverdue } from '../utils/taskListUtils';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const DashboardScreen = () => {
  const { user, isFieldOwner } = useAuth();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation(['dashboard', 'common', 'nav']);
  const navigation = useNavigation<Nav>();
  const { stats, loading, refresh } = useDashboardStats();
  const { refreshing, onRefresh } = useRefresh(refresh);
  const { tasks } = useTasks();
  const { fields, fieldTaskCounts } = useFields();

  const goTab = (screen: 'Fields' | 'Tasks' | 'Calendar', params?: object) => {
    navigation.navigate('Main', { screen, params });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard:greetingMorning');
    if (hour < 18) return t('dashboard:greetingAfternoon');
    return t('dashboard:greetingEvening');
  };

  const todayTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter(task => {
      if (!task.scheduledStart || task.status === 'completed') return false;
      const scheduled = new Date(task.scheduledStart);
      scheduled.setHours(0, 0, 0, 0);
      return scheduled.getTime() === today.getTime();
    });
  }, [tasks]);

  const overdueCount = useMemo(
    () => tasks.filter(tk => tk.status !== 'completed' && isTaskOverdue(tk)).length,
    [tasks]
  );

  const pendingApproval = useMemo(
    () => tasks.filter(tk => tk.approvalStatus === 'pending'),
    [tasks]
  );

  const topFields = useMemo(() => fields.slice(0, 3), [fields]);

  const quickActions = isFieldOwner()
    ? [
        { id: 'fields', icon: 'leaf-outline' as const, label: t('nav:fieldsOwner'), onPress: () => goTab('Fields') },
        { id: 'calendar', icon: 'calendar-outline' as const, label: t('nav:calendar'), onPress: () => goTab('Calendar') },
        { id: 'tasks', icon: 'list-outline' as const, label: t('nav:tasks'), onPress: () => goTab('Tasks') },
        {
          id: 'create',
          icon: 'add-circle-outline' as const,
          label: t('dashboard:quickCreateTask'),
          onPress: () => navigation.navigate('CreateTask', {}),
          accentColor: colors.success,
        },
      ]
    : [
        { id: 'today', icon: 'sunny-outline' as const, label: t('nav:today'), onPress: () => navigation.navigate('Main', { screen: 'Today' }) },
        { id: 'calendar', icon: 'calendar-outline' as const, label: t('nav:calendar'), onPress: () => goTab('Calendar') },
        { id: 'tasks', icon: 'list-outline' as const, label: t('nav:tasksProducer'), onPress: () => goTab('Tasks') },
        { id: 'fields', icon: 'leaf-outline' as const, label: t('nav:fields'), onPress: () => goTab('Fields') },
      ];

  if (loading && !stats) return <LoadingSpinner fullScreen />;
  if (!user || !stats) return null;

  const dateLabel = formatLocaleDate(new Date(), i18n.language, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const hasUrgent = todayTasks.length > 0 || pendingApproval.length > 0 || overdueCount > 0;

  return (
    <ScreenLayout
      scroll
      refreshControl={{ refreshing, onRefresh }}
      contentContainerStyle={styles.scrollContent}
    >
      <ScreenHeader
        title={`${getGreeting()}${user.firstName ? `, ${user.firstName}` : ''}`}
        subtitle={dateLabel}
      />

      <Section title={t('dashboard:quickActions')}>
        <QuickActionRow actions={quickActions} />
      </Section>

      <Section title={t('dashboard:overview')}>
        <View style={styles.metricsGrid}>
          {isFieldOwner() ? (
            <>
              <MetricTile
                icon="leaf"
                value={stats.totalFields || 0}
                label={t('dashboard:stats.fields')}
                onPress={() => goTab('Fields')}
              />
              <MetricTile
                icon="resize-outline"
                value={(stats.totalArea || 0).toFixed(1)}
                label={t('dashboard:stats.hectares')}
                onPress={() => goTab('Fields')}
              />
              <MetricTile
                icon="time-outline"
                value={stats.pendingTasks || 0}
                label={t('dashboard:stats.pending')}
                accentColor={colors.warning}
                onPress={() => goTab('Tasks', { filter: 'pending' })}
              />
              <MetricTile
                icon="calendar-outline"
                value={todayTasks.length}
                label={t('dashboard:dueToday')}
                accentColor={colors.info}
                onPress={() => goTab('Calendar', { date: new Date().toISOString() })}
              />
            </>
          ) : (
            <>
              <MetricTile
                icon="clipboard-outline"
                value={stats.totalTasks || 0}
                label={t('dashboard:stats.total')}
                onPress={() => goTab('Tasks')}
              />
              <MetricTile
                icon="sync-outline"
                value={stats.inProgressTasks || 0}
                label={t('dashboard:stats.inProgress')}
                accentColor={colors.info}
                onPress={() => goTab('Tasks', { filter: 'in_progress' })}
              />
              <MetricTile
                icon="alert-circle-outline"
                value={overdueCount}
                label={t('dashboard:overdue')}
                accentColor={colors.error}
                onPress={() => goTab('Tasks')}
              />
              <MetricTile
                icon="calendar-outline"
                value={todayTasks.length}
                label={t('dashboard:dueToday')}
                onPress={() => goTab('Calendar', { date: new Date().toISOString() })}
              />
            </>
          )}
        </View>
      </Section>

      {hasUrgent ? (
        <Section
          title={t('dashboard:needsAttention')}
          actionLabel={t('dashboard:viewAllTasks')}
          onActionPress={() => goTab('Tasks')}
        >
          {overdueCount > 0 ? (
            <TouchableOpacity onPress={() => goTab('Tasks')}>
              <Card
                variant="outlined"
                style={{ marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.error }}
              >
                <View style={styles.alertRow}>
                  <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
                  <View style={styles.alertTextBlock}>
                    <Text style={[styles.alertText, { color: colors.textPrimary }]}>
                      {t('dashboard:overdueTasks', { count: overdueCount })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </View>
              </Card>
            </TouchableOpacity>
          ) : null}

          {isFieldOwner() && pendingApproval.length > 0 ? (
            <TouchableOpacity
              onPress={() => goTab('Tasks', { filter: 'approval' })}
            >
              <Card
                variant="outlined"
                style={{ marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.warning }}
              >
                <View style={styles.alertRow}>
                  <Ionicons name="hourglass-outline" size={20} color={colors.warning} />
                  <View style={styles.alertTextBlock}>
                    <Text style={[styles.alertText, { color: colors.textPrimary }]}>
                      {t('dashboard:pendingApproval')}
                    </Text>
                    <Text style={[styles.alertSub, { color: colors.textSecondary }]}>
                      {pendingApproval.length} {t('dashboard:viewTasks')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </View>
              </Card>
            </TouchableOpacity>
          ) : null}

          {todayTasks.slice(0, 2).map(task => (
            <TaskCard
              key={task.id}
              task={task}
              compact
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
            />
          ))}

          {todayTasks.length > 2 ? (
            <TouchableOpacity
              style={styles.seeMore}
              onPress={() => goTab('Calendar', { date: new Date().toISOString() })}
            >
              <Text style={{ color: colors.primaryDark, fontWeight: '600' }}>
                {t('dashboard:seeCalendar', { count: todayTasks.length })}
              </Text>
            </TouchableOpacity>
          ) : null}
        </Section>
      ) : (
        <Section title={t('dashboard:needsAttention')}>
          <EmptyState
            icon={<Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />}
            title={t('dashboard:noUrgent')}
            description={t('dashboard:allClearHint')}
          />
        </Section>
      )}

      {isFieldOwner() && topFields.length > 0 ? (
        <Section
          title={t('dashboard:yourFields')}
          actionLabel={t('dashboard:seeAllFields')}
          onActionPress={() => goTab('Fields')}
        >
          {topFields.map(field => (
            <FieldCard
              key={field.id}
              field={field}
              taskCount={fieldTaskCounts[field.id]}
              onPress={() => navigation.navigate('FieldDetail', { fieldId: field.id })}
              onViewTasks={() => goTab('Tasks', { fieldId: field.id })}
              onViewCalendar={() =>
                goTab('Calendar', { fieldId: field.id, date: new Date().toISOString() })
              }
            />
          ))}
        </Section>
      ) : null}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: spacing['2xl'] },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  alertTextBlock: { flex: 1 },
  alertText: { ...typography.styles.body, fontWeight: '600' },
  alertSub: { ...typography.styles.bodySmall, marginTop: 2 },
  seeMore: { alignItems: 'center', paddingVertical: spacing.sm },
});

export default DashboardScreen;

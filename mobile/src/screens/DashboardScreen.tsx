import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useRefresh } from '../hooks/useRefresh';
import { useTasks } from '../hooks/useTasks';
import Section from '../components/layout/Section';
import LoadingSpinner from '../components/LoadingSpinner';
import Card from '../components/ui/Card';
import TaskCard from '../components/domain/TaskCard';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { formatLocaleDate } from '../utils/formatters';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const DashboardScreen = () => {
  const { user, isFieldOwner } = useAuth();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const navigation = useNavigation<Nav>();
  const { stats, loading, refresh } = useDashboardStats();
  const { refreshing, onRefresh } = useRefresh(refresh);
  const { tasks } = useTasks();

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

  const pendingApproval = useMemo(
    () => tasks.filter(t => t.approvalStatus === 'pending'),
    [tasks]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
        welcomeSection: { marginBottom: spacing.lg, paddingTop: spacing.sm },
        greeting: {
          ...typography.styles.h2,
          fontWeight: typography.fontWeight.bold,
          color: colors.textPrimary,
          marginBottom: spacing.xs,
          fontSize: 24,
        },
        welcomeSubtitle: { ...typography.styles.body, color: colors.textSecondary, fontSize: 14 },
        metricsCard: { padding: spacing.md },
        metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
        metricItem: {
          flex: 1,
          minWidth: '45%',
          alignItems: 'center',
          padding: spacing.sm,
          backgroundColor: colors.background,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
        },
        metricIcon: { fontSize: 24, marginBottom: spacing.xs },
        metricValue: {
          ...typography.styles.h3,
          fontWeight: typography.fontWeight.bold,
          color: colors.textPrimary,
          fontSize: 22,
        },
        metricLabel: {
          ...typography.styles.caption,
          color: colors.textSecondary,
          fontSize: 11,
          textAlign: 'center',
        },
        alertCard: {
          padding: spacing.md,
          borderLeftWidth: 3,
          borderLeftColor: colors.warning,
          marginBottom: spacing.sm,
        },
        alertText: { ...typography.styles.body, color: colors.textPrimary, fontWeight: '600' },
        alertSub: { ...typography.styles.bodySmall, color: colors.textSecondary, marginTop: 4 },
        emptyText: {
          ...typography.styles.body,
          color: colors.textSecondary,
          textAlign: 'center',
          padding: spacing.lg,
        },
      }),
    [colors]
  );

  if (loading && !stats) return <LoadingSpinner fullScreen />;
  if (!user || !stats) return null;

  const Stat = ({ icon, value, label, color }: { icon: string; value: string | number; label: string; color?: string }) => (
    <View style={styles.metricItem}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={[styles.metricValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.welcomeSection}>
        <Text style={styles.greeting}>
          {getGreeting()}
          {user.firstName ? `, ${user.firstName}` : ''}
        </Text>
        <Text style={styles.welcomeSubtitle}>
          {formatLocaleDate(new Date(), i18n.language, { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      <Section title={t('dashboard:overview')}>
        <Card style={styles.metricsCard}>
          <View style={styles.metricsGrid}>
            {isFieldOwner() ? (
              <>
                <Stat icon="🫒" value={stats.totalFields || 0} label={t('dashboard:stats.fields')} />
                <Stat icon="📏" value={(stats.totalArea || 0).toFixed(1)} label={t('dashboard:stats.hectares')} />
                <Stat icon="⏳" value={stats.pendingTasks || 0} label={t('dashboard:stats.pending')} color={colors.warning} />
                <Stat icon="✅" value={`${stats.completionRate || 0}%`} label={t('dashboard:stats.complete')} color={colors.success} />
              </>
            ) : (
              <>
                <Stat icon="📋" value={stats.totalTasks || 0} label={t('dashboard:stats.total')} />
                <Stat icon="⏳" value={stats.pendingTasks || 0} label={t('dashboard:stats.pending')} color={colors.warning} />
                <Stat icon="🔄" value={stats.inProgressTasks || 0} label={t('dashboard:stats.inProgress')} color={colors.info} />
                <Stat icon="✅" value={stats.completedTasks || 0} label={t('dashboard:stats.completed')} color={colors.success} />
              </>
            )}
          </View>
        </Card>
      </Section>

      {(todayTasks.length > 0 || pendingApproval.length > 0) ? (
        <Section title={t('dashboard:needsAttention')}>
          {isFieldOwner() && pendingApproval.length > 0 ? (
            <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Tasks', params: { filter: 'approval' } })}>
              <Card style={styles.alertCard}>
                <Text style={styles.alertText}>✋ {t('dashboard:pendingApproval')}</Text>
                <Text style={styles.alertSub}>{pendingApproval.length} {t('dashboard:viewTasks')}</Text>
              </Card>
            </TouchableOpacity>
          ) : null}
          {todayTasks.slice(0, 3).map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
            />
          ))}
        </Section>
      ) : (
        <Text style={styles.emptyText}>{t('dashboard:noUrgent')}</Text>
      )}
    </ScrollView>
  );
};

export default DashboardScreen;

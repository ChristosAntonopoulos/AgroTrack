import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useRefresh } from '../hooks/useRefresh';
import { useTasks } from '../hooks/useTasks';
import { toBoolean } from '../utils/booleanConverter';
import Section from '../components/layout/Section';
import LoadingSpinner from '../components/LoadingSpinner';
import WeatherWidget from '../components/domain/WeatherWidget';
import UrgentActionsCard, { UrgentAction } from '../components/domain/UrgentActionsCard';
import Card from '../components/ui/Card';
import { locationService } from '../services/locationService';
import { colors, typography, spacing } from '../theme';

interface DashboardScreenProps {
  navigation: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { stats, loading, refresh } = useDashboardStats();
  const { refreshing, onRefresh } = useRefresh(refresh);
  const { tasks } = useTasks();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // Get user's current location for weather
  useEffect(() => {
    const loadUserLocation = async () => {
      try {
        setLocationLoading(true);
        const location = await locationService.getCurrentLocation();
        setUserLocation(location);
      } catch (error) {
        console.error('Error loading user location:', error);
        // Fallback to default location
        setUserLocation({ lat: 37.7749, lng: -122.4194 });
      } finally {
        setLocationLoading(false);
      }
    };
    loadUserLocation();
  }, []);

  // Generate urgent actions based on stats and data
  const urgentActions = useMemo((): UrgentAction[] => {
    if (!tasks || !stats) return [];
    
    const actions: UrgentAction[] = [];
    
    // Tasks due today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tasksDueToday = tasks.filter(t => {
      if (!t.scheduledStart || t.status === 'completed') return false;
      const scheduled = new Date(t.scheduledStart);
      scheduled.setHours(0, 0, 0, 0);
      return scheduled.getTime() === today.getTime() && t.status === 'pending';
    });
    
    tasksDueToday.forEach(task => {
      actions.push({
        id: `task_${task.id}`,
        type: 'task_due',
        title: task.title,
        description: `Due today`,
        priority: 'high',
        dueDate: task.scheduledStart ? new Date(task.scheduledStart) : undefined,
        taskId: task.id,
        onPress: () => {
          if (navigation?.navigate) {
            navigation.navigate('TaskDetail', { taskId: task.id });
          }
        },
      });
    });
    
    // Fields needing attention (for FieldOwner/Agronomist)
    if (stats.fieldsNeedingAttention && stats.fieldsNeedingAttention > 0) {
      actions.push({
        id: 'fields_attention',
        type: 'field_attention',
        title: 'Fields Need Attention',
        description: `${stats.fieldsNeedingAttention} field(s) require attention`,
        priority: 'medium',
        onPress: () => {
          if (navigation?.navigate) {
            navigation.navigate('Fields');
          }
        },
      });
    }
    
    return actions;
  }, [tasks, stats, navigation]);

  const handleRefresh = async () => {
    try {
      await onRefresh();
      // Reload location on refresh
      if (!userLocation) {
        const location = await locationService.getCurrentLocation();
        setUserLocation(location);
      }
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const safeLoading = toBoolean(loading, 'DashboardScreen.loading');
  const safeRefreshing = toBoolean(refreshing, 'DashboardScreen.refreshing');
  
  if (safeLoading && !stats) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user || !stats) {
    return null;
  }

  const refreshControlElement = <RefreshControl refreshing={safeRefreshing} onRefresh={handleRefresh} />;

  // Render elegant metrics card
  const renderMetricsCard = () => {
    switch (user.role) {
      case 'FieldOwner':
        return (
          <Card style={styles.metricsCard}>
            <View style={styles.metricsHeader}>
              <Text style={styles.metricsTitle}>Overview</Text>
            </View>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>🏡</Text>
                <Text style={styles.metricValue}>{stats.totalFields || 0}</Text>
                <Text style={styles.metricLabel}>Fields</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>📏</Text>
                <Text style={styles.metricValue}>
                  {stats.totalArea ? stats.totalArea.toFixed(1) : '0'}
                </Text>
                <Text style={styles.metricLabel}>Hectares</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>⏳</Text>
                <Text style={[styles.metricValue, { color: colors.warning }]}>
                  {stats.pendingTasks || 0}
                </Text>
                <Text style={styles.metricLabel}>Pending</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>📊</Text>
                <Text style={[styles.metricValue, { color: colors.success }]}>
                  {stats.completionRate || 0}%
                </Text>
                <Text style={styles.metricLabel}>Complete</Text>
              </View>
            </View>
          </Card>
        );

      case 'Producer':
        return (
          <Card style={styles.metricsCard}>
            <View style={styles.metricsHeader}>
              <Text style={styles.metricsTitle}>Tasks</Text>
              <Text style={styles.metricsSubtitle}>
                {stats.completionRate || 0}% completed
              </Text>
            </View>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>📋</Text>
                <Text style={styles.metricValue}>{stats.totalTasks || 0}</Text>
                <Text style={styles.metricLabel}>Total</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>⏳</Text>
                <Text style={[styles.metricValue, { color: colors.warning }]}>
                  {stats.pendingTasks || 0}
                </Text>
                <Text style={styles.metricLabel}>Pending</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>🔄</Text>
                <Text style={[styles.metricValue, { color: colors.info }]}>
                  {stats.inProgressTasks || 0}
                </Text>
                <Text style={styles.metricLabel}>In Progress</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>✅</Text>
                <Text style={[styles.metricValue, { color: colors.success }]}>
                  {stats.completedTasks || 0}
                </Text>
                <Text style={styles.metricLabel}>Completed</Text>
              </View>
            </View>
            {stats.totalTasks && stats.totalTasks > 0 ? (
              <View style={styles.completionBarContainer}>
                <View style={styles.completionBar}>
                  <View
                    style={[
                      styles.completionBarFill,
                      {
                        width: `${stats.completionRate || 0}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ) : null}
          </Card>
        );

      case 'Agronomist':
        return (
          <Card style={styles.metricsCard}>
            <View style={styles.metricsHeader}>
              <Text style={styles.metricsTitle}>Fields Monitored</Text>
            </View>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>👁️</Text>
                <Text style={styles.metricValue}>{stats.fieldsMonitored || 0}</Text>
                <Text style={styles.metricLabel}>Fields</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>⚠️</Text>
                <Text style={[styles.metricValue, { color: colors.warning }]}>
                  {stats.fieldsNeedingAttention || 0}
                </Text>
                <Text style={styles.metricLabel}>Need Attention</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>💚</Text>
                <Text style={[styles.metricValue, { color: colors.success }]}>
                  {stats.averageHealthScore || 0}
                </Text>
                <Text style={styles.metricLabel}>Health Score</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>📋</Text>
                <Text style={styles.metricValue}>{stats.totalTasks || 0}</Text>
                <Text style={styles.metricLabel}>Tasks</Text>
              </View>
            </View>
          </Card>
        );

      case 'ServiceProvider':
        return (
          <Card style={styles.metricsCard}>
            <View style={styles.metricsHeader}>
              <Text style={styles.metricsTitle}>Services</Text>
            </View>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>🔧</Text>
                <Text style={styles.metricValue}>{stats.activeServices || 0}</Text>
                <Text style={styles.metricLabel}>Active</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>📥</Text>
                <Text style={[styles.metricValue, { color: colors.warning }]}>
                  {stats.pendingRequests || 0}
                </Text>
                <Text style={styles.metricLabel}>Pending</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>📋</Text>
                <Text style={styles.metricValue}>{stats.totalTasks || 0}</Text>
                <Text style={styles.metricLabel}>Tasks</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>📊</Text>
                <Text style={[styles.metricValue, { color: colors.success }]}>
                  {stats.completionRate || 0}%
                </Text>
                <Text style={styles.metricLabel}>Complete</Text>
              </View>
            </View>
          </Card>
        );

      case 'Administrator':
        return (
          <Card style={styles.metricsCard}>
            <View style={styles.metricsHeader}>
              <Text style={styles.metricsTitle}>System Overview</Text>
            </View>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>👥</Text>
                <Text style={styles.metricValue}>{stats.totalUsers || 0}</Text>
                <Text style={styles.metricLabel}>Users</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>🏡</Text>
                <Text style={styles.metricValue}>{stats.totalFields || 0}</Text>
                <Text style={styles.metricLabel}>Fields</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>📋</Text>
                <Text style={styles.metricValue}>{stats.totalTasks || 0}</Text>
                <Text style={styles.metricLabel}>Tasks</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>⏳</Text>
                <Text style={[styles.metricValue, { color: colors.warning }]}>
                  {stats.pendingTasks || 0}
                </Text>
                <Text style={styles.metricLabel}>Pending</Text>
              </View>
            </View>
          </Card>
        );

      default:
        return (
          <Card style={styles.metricsCard}>
            <View style={styles.metricsHeader}>
              <Text style={styles.metricsTitle}>Overview</Text>
            </View>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>📋</Text>
                <Text style={styles.metricValue}>{stats.totalTasks || 0}</Text>
                <Text style={styles.metricLabel}>Tasks</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>⏳</Text>
                <Text style={[styles.metricValue, { color: colors.warning }]}>
                  {stats.pendingTasks || 0}
                </Text>
                <Text style={styles.metricLabel}>Pending</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricIcon}>✅</Text>
                <Text style={[styles.metricValue, { color: colors.success }]}>
                  {stats.completedTasks || 0}
                </Text>
                <Text style={styles.metricLabel}>Completed</Text>
              </View>
            </View>
          </Card>
        );
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={refreshControlElement}
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.greeting}>
          {getGreeting()}{user.firstName ? `, ${user.firstName}` : ''}
        </Text>
        <Text style={styles.welcomeSubtitle}>
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>
      </View>

      {/* Current Location Weather */}
      {userLocation && !locationLoading ? (
        <Section title="Weather at Your Location">
          <WeatherWidget
            location={userLocation}
            fieldName="Your Location"
            compact
          />
        </Section>
      ) : null}

      {/* Key Metrics - Elegant Single Card */}
      <Section title="Overview">
        {renderMetricsCard()}
      </Section>

      {/* Urgent Actions */}
      {urgentActions.length > 0 ? (
        <Section title="Requires Attention">
          <UrgentActionsCard actions={urgentActions} maxItems={5} />
        </Section>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.base,
  },
  welcomeSection: {
    marginBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  greeting: {
    ...typography.styles.h2,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontSize: 24,
  },
  welcomeSubtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  metricsCard: {
    padding: spacing.md,
  },
  metricsHeader: {
    marginBottom: spacing.md,
  },
  metricsTitle: {
    ...typography.styles.h4,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  metricsSubtitle: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
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
  metricIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  metricValue: {
    ...typography.styles.h3,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    fontSize: 24,
    marginBottom: spacing.xs / 2,
  },
  metricLabel: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  completionBarContainer: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  completionBar: {
    height: 6,
    backgroundColor: colors.gray200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  completionBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
});

export default DashboardScreen;

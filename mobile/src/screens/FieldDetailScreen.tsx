import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { fieldService, Field } from '../services/fieldService';
import { taskService, Task } from '../services/taskService';
import { lifecycleService, Lifecycle } from '../services/lifecycleService';
import Card from '../components/ui/Card';
import ListItem from '../components/lists/ListItem';
import Section from '../components/layout/Section';
import StatCard from '../components/domain/StatCard';
import StatsGrid from '../components/layout/StatsGrid';
import Button from '../components/ui/Button';
import LifecycleIndicator from '../components/LifecycleIndicator';
import LoadingSpinner from '../components/LoadingSpinner';
import WeatherWidget from '../components/domain/WeatherWidget';
import StatusBadge from '../components/StatusBadge';
import { weatherService, WeatherAlert } from '../services/weatherService';
import { colors, typography, spacing } from '../theme';
import { formatDate } from '../utils/formatters';
import { toBoolean } from '../utils/booleanConverter';

interface FieldDetailScreenProps {
  route: { params: { fieldId: string } };
  navigation: any;
}

const FieldDetailScreen: React.FC<FieldDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { fieldId } = route.params;
  const [field, setField] = useState<Field | null>(null);
  const [lifecycle, setLifecycle] = useState<Lifecycle | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);

  useEffect(() => {
    loadFieldDetails();
  }, [fieldId]);

  const loadFieldDetails = async () => {
    try {
      setLoading(true);
      const [fieldData, lifecycleData, tasksData] = await Promise.all([
        fieldService.getField(fieldId),
        lifecycleService.getLifecycle(fieldId),
        taskService.getTasksByField(fieldId),
      ]);
      setField(fieldData);
      setLifecycle(lifecycleData);
      setTasks(tasksData);

      // Load weather alerts if field has coordinates
      if (fieldData?.latitude && fieldData?.longitude) {
        try {
          const alerts = await weatherService.getWeatherAlerts(
            fieldData.latitude,
            fieldData.longitude
          );
          setWeatherAlerts(alerts);
        } catch (error) {
          console.error('Error loading weather alerts:', error);
        }
      }
    } catch (error) {
      console.error('Error loading field details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskPress = (task: Task) => {
    navigation.navigate('TaskDetail', { taskId: task.id });
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!field) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Field not found</Text>
        <Button
          title="Back"
          onPress={() => navigation.goBack()}
          variant="outline"
        />
      </View>
    );
  }

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: completedCount,
    completionRate: tasks.length > 0
      ? Math.round((completedCount / tasks.length) * 100)
      : 0,
  };

  const fieldLocation = field.latitude && field.longitude
    ? { lat: field.latitude, lng: field.longitude }
    : null;

  const handleOpenGPS = () => {
    if (field.latitude && field.longitude) {
      const url = `https://www.google.com/maps?q=${field.latitude},${field.longitude}`;
      Linking.openURL(url).catch(err => console.error('Error opening GPS:', err));
    }
  };

  const getTaskTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'Pruning': '✂️',
      'Harvesting': '🌾',
      'Fertilization': '🌱',
      'Irrigation': '💧',
      'Pest Control': '🐛',
      'Soil Analysis': '🔬',
    };
    return icons[type] || '📋';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return colors.error;
      case 'high':
        return colors.warning;
      case 'medium':
        return colors.info;
      default:
        return colors.gray400;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Header Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroHeader}>
          <Text style={styles.heroIcon}>🏡</Text>
          <View style={styles.heroTitleContainer}>
            <Text style={styles.heroTitle}>{field.name}</Text>
            <View style={styles.lifecycleBadgeContainer}>
              <LifecycleIndicator year={field.currentLifecycleYear} />
            </View>
          </View>
        </View>
        
        {/* Quick Stats Row */}
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatCard}>
            <Text style={styles.quickStatIcon}>📏</Text>
            <Text style={styles.quickStatValue}>{field.area}</Text>
            <Text style={styles.quickStatLabel}>ha</Text>
          </View>
          {field.variety ? (
            <View style={styles.quickStatCard}>
              <Text style={styles.quickStatIcon}>🌳</Text>
              <Text style={styles.quickStatValue} numberOfLines={1}>
                {field.variety}
              </Text>
            </View>
          ) : null}
          {field.treeAge ? (
            <View style={styles.quickStatCard}>
              <Text style={styles.quickStatIcon}>⏳</Text>
              <Text style={styles.quickStatValue}>{field.treeAge}</Text>
              <Text style={styles.quickStatLabel}>years</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Weather & Location Section */}
      {fieldLocation ? (
        <Section title="Weather & Location">
          <WeatherWidget
            location={fieldLocation}
            fieldName={field.name}
            field={{
              irrigationStatus: field.irrigationStatus,
              currentLifecycleYear: field.currentLifecycleYear,
            }}
          />
          
          {/* Weather Alerts */}
          {weatherAlerts.length > 0 ? (
            <View style={styles.alertsContainer}>
              {weatherAlerts.map((alert, index) => (
                <Card
                  key={index}
                  style={[
                    styles.alertCard,
                    { borderLeftColor: getSeverityColor(alert.severity) },
                  ]}
                >
                  <View style={styles.alertHeader}>
                    <Text style={styles.alertIcon}>
                      {alert.type === 'frost' ? '❄️' :
                       alert.type === 'storm' ? '⛈️' :
                       alert.type === 'drought' ? '🌵' :
                       alert.type === 'wind' ? '💨' : '🌡️'}
                    </Text>
                    <View style={styles.alertContent}>
                      <Text style={styles.alertTitle}>{alert.type.toUpperCase()} Alert</Text>
                      <Text style={styles.alertMessage}>{alert.message}</Text>
                    </View>
                    <View
                      style={[
                        styles.severityBadge,
                        { backgroundColor: getSeverityColor(alert.severity) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.severityText,
                          { color: getSeverityColor(alert.severity) },
                        ]}
                      >
                        {alert.severity}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          ) : null}

          {/* GPS Location */}
          <Card style={styles.gpsCard}>
            <View style={styles.gpsHeader}>
              <Text style={styles.gpsIcon}>📍</Text>
              <View style={styles.gpsInfo}>
                <Text style={styles.gpsTitle}>GPS Coordinates</Text>
                <Text style={styles.gpsCoordinates}>
                  {field.latitude.toFixed(6)}, {field.longitude.toFixed(6)}
                </Text>
              </View>
              <Button
                title="🗺️ Maps"
                onPress={handleOpenGPS}
                variant="outline"
                size="small"
                style={styles.gpsButton}
              />
            </View>
          </Card>
        </Section>
      ) : null}

      {/* Task Overview - Elegant Design */}
      <Section title="Task Overview">
        <Card style={styles.taskOverviewCard}>
          <View style={styles.taskOverviewHeader}>
            <View style={styles.taskOverviewTitleRow}>
              <Text style={styles.taskOverviewIcon}>📋</Text>
              <View style={styles.taskOverviewTitleContainer}>
                <Text style={styles.taskOverviewTitle}>Total Tasks</Text>
                <Text style={styles.taskOverviewSubtitle}>
                  {taskStats.completionRate}% completed
                </Text>
              </View>
              <Text style={styles.taskOverviewTotal}>{taskStats.total}</Text>
            </View>
            
            {/* Overall Progress Bar */}
            {tasks.length > 0 ? (
              <View style={styles.taskOverviewProgressContainer}>
                <View style={styles.taskOverviewProgressBar}>
                  <View
                    style={[
                      styles.taskOverviewProgressFill,
                      {
                        width: `${taskStats.completionRate}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ) : null}
          </View>

          {/* Task Status Breakdown */}
          <View style={styles.taskBreakdown}>
            <View style={styles.taskBreakdownItem}>
              <View style={styles.taskBreakdownHeader}>
                <View style={[styles.taskBreakdownDot, { backgroundColor: colors.warning }]} />
                <Text style={styles.taskBreakdownLabel}>Pending</Text>
              </View>
              <Text style={styles.taskBreakdownValue}>{taskStats.pending}</Text>
              {tasks.length > 0 ? (
                <View style={styles.taskBreakdownBar}>
                  <View
                    style={[
                      styles.taskBreakdownBarFill,
                      {
                        width: `${(taskStats.pending / tasks.length) * 100}%`,
                        backgroundColor: colors.warning,
                      },
                    ]}
                  />
                </View>
              ) : null}
            </View>

            <View style={styles.taskBreakdownItem}>
              <View style={styles.taskBreakdownHeader}>
                <View style={[styles.taskBreakdownDot, { backgroundColor: colors.info }]} />
                <Text style={styles.taskBreakdownLabel}>In Progress</Text>
              </View>
              <Text style={styles.taskBreakdownValue}>{taskStats.inProgress}</Text>
              {tasks.length > 0 ? (
                <View style={styles.taskBreakdownBar}>
                  <View
                    style={[
                      styles.taskBreakdownBarFill,
                      {
                        width: `${(taskStats.inProgress / tasks.length) * 100}%`,
                        backgroundColor: colors.info,
                      },
                    ]}
                  />
                </View>
              ) : null}
            </View>

            <View style={styles.taskBreakdownItem}>
              <View style={styles.taskBreakdownHeader}>
                <View style={[styles.taskBreakdownDot, { backgroundColor: colors.success }]} />
                <Text style={styles.taskBreakdownLabel}>Completed</Text>
              </View>
              <Text style={styles.taskBreakdownValue}>{taskStats.completed}</Text>
              {tasks.length > 0 ? (
                <View style={styles.taskBreakdownBar}>
                  <View
                    style={[
                      styles.taskBreakdownBarFill,
                      {
                        width: `${(taskStats.completed / tasks.length) * 100}%`,
                        backgroundColor: colors.success,
                      },
                    ]}
                  />
                </View>
              ) : null}
            </View>
          </View>
        </Card>
      </Section>

      {/* Field Information */}
      <Section title="Field Details">
        <Card>
          <View style={styles.infoGroup}>
            <Text style={styles.infoGroupTitle}>Basic Information</Text>
            <ListItem
              title="Area"
              leftIcon={<Text style={styles.listIcon}>📏</Text>}
              rightContent={<Text style={styles.value}>{field.area} hectares</Text>}
              showDivider={true}
            />
            {field.variety ? (
              <ListItem
                title="Variety"
                leftIcon={<Text style={styles.listIcon}>🌳</Text>}
                rightContent={<Text style={styles.value}>{field.variety}</Text>}
                showDivider={true}
              />
            ) : null}
            {field.treeAge ? (
              <ListItem
                title="Tree Age"
                leftIcon={<Text style={styles.listIcon}>⏳</Text>}
                rightContent={<Text style={styles.value}>{field.treeAge} years</Text>}
                showDivider={false}
              />
            ) : null}
          </View>

          <View style={styles.infoGroup}>
            <Text style={styles.infoGroupTitle}>Soil & Infrastructure</Text>
            {field.groundType ? (
              <ListItem
                title="Ground Type"
                leftIcon={<Text style={styles.listIcon}>🌍</Text>}
                rightContent={<Text style={styles.value}>{field.groundType}</Text>}
                showDivider={true}
              />
            ) : null}
            <ListItem
              title="Irrigation"
              leftIcon={<Text style={styles.listIcon}>💧</Text>}
              rightContent={
                <View style={styles.irrigationStatus}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: toBoolean(field.irrigationStatus)
                          ? colors.success
                          : colors.gray400,
                      },
                    ]}
                  />
                  <Text style={styles.value}>
                    {toBoolean(field.irrigationStatus) ? 'Yes' : 'No'}
                  </Text>
                </View>
              }
              showDivider={false}
            />
          </View>
        </Card>
      </Section>

      {/* Lifecycle Information */}
      {lifecycle ? (
        <Section title="Lifecycle">
          <Card>
            <View style={styles.lifecycleHeader}>
              <View style={styles.lifecycleIndicatorContainer}>
                <Text style={styles.lifecycleLabel}>Current Year</Text>
                <LifecycleIndicator year={lifecycle.currentYear} />
              </View>
            </View>
            <View style={styles.lifecycleDates}>
              <View style={styles.dateCard}>
                <Text style={styles.dateLabel}>Cycle Start</Text>
                <Text style={styles.dateValue}>
                  {formatDate(lifecycle.cycleStartDate)}
                </Text>
              </View>
              {lifecycle.lastProgressionDate ? (
                <View style={styles.dateCard}>
                  <Text style={styles.dateLabel}>Last Progression</Text>
                  <Text style={styles.dateValue}>
                    {formatDate(lifecycle.lastProgressionDate)}
                  </Text>
                </View>
              ) : null}
            </View>
          </Card>
        </Section>
      ) : null}

      {/* Tasks Section */}
      {tasks.length > 0 ? (
        <Section title="Tasks">
          {tasks.slice(0, 5).map((task) => (
            <Card
              key={task.id}
              onPress={() => handleTaskPress(task)}
              style={styles.taskCard}
            >
              <View style={styles.taskHeader}>
                <View style={styles.taskTitleRow}>
                  <Text style={styles.taskTypeIcon}>
                    {getTaskTypeIcon(task.type)}
                  </Text>
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskType}>{task.type}</Text>
                  </View>
                </View>
                <StatusBadge status={task.status} showIcon={true} />
              </View>
              {task.description ? (
                <Text style={styles.taskDescription} numberOfLines={2}>
                  {task.description}
                </Text>
              ) : null}
              <View style={styles.taskFooter}>
                {task.scheduledStart ? (
                  <View style={styles.taskDate}>
                    <Text style={styles.taskDateIcon}>📅</Text>
                    <Text style={styles.taskDateText}>
                      {formatDate(task.scheduledStart)}
                    </Text>
                  </View>
                ) : null}
                {task.scheduledEnd && task.scheduledStart ? (
                  <Text style={styles.taskDateSeparator}>→</Text>
                ) : null}
                {task.scheduledEnd ? (
                  <View style={styles.taskDate}>
                    <Text style={styles.taskDateText}>
                      {formatDate(task.scheduledEnd)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Card>
          ))}
          {tasks.length > 5 ? (
            <Button
              title={`View All ${tasks.length} Tasks`}
              onPress={() => navigation.navigate('Tasks', { fieldId: field.id })}
              variant="outline"
              style={styles.viewAllButton}
            />
          ) : null}
        </Section>
      ) : null}

      <View style={styles.bottomSpacing} />
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
    paddingBottom: spacing.xl,
  },
  heroSection: {
    backgroundColor: colors.primary + '08',
    borderRadius: 16,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  heroIcon: {
    fontSize: 32,
    marginRight: spacing.sm,
  },
  heroTitleContainer: {
    flex: 1,
  },
  heroTitle: {
    ...typography.styles.h1,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.bold,
    fontSize: 28,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  lifecycleBadgeContainer: {
    alignSelf: 'flex-start',
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickStatIcon: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  quickStatValue: {
    ...typography.styles.body,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    fontSize: 16,
    textAlign: 'center',
  },
  quickStatLabel: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  alertsContainer: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  alertCard: {
    borderLeftWidth: 4,
    padding: spacing.sm,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  alertIcon: {
    fontSize: 24,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    ...typography.styles.body,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  alertMessage: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
  },
  severityBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    ...typography.styles.caption,
    fontWeight: typography.fontWeight.semibold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  gpsCard: {
    marginTop: spacing.sm,
  },
  gpsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  gpsIcon: {
    fontSize: 24,
  },
  gpsInfo: {
    flex: 1,
  },
  gpsTitle: {
    ...typography.styles.body,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  gpsCoordinates: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  gpsButton: {
    marginLeft: 'auto',
  },
  taskOverviewCard: {
    padding: spacing.md,
  },
  taskOverviewHeader: {
    marginBottom: spacing.md,
  },
  taskOverviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  taskOverviewIcon: {
    fontSize: 28,
    marginRight: spacing.sm,
  },
  taskOverviewTitleContainer: {
    flex: 1,
  },
  taskOverviewTitle: {
    ...typography.styles.h4,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  taskOverviewSubtitle: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  taskOverviewTotal: {
    ...typography.styles.h2,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    fontSize: 32,
    letterSpacing: -1,
  },
  taskOverviewProgressContainer: {
    marginTop: spacing.sm,
  },
  taskOverviewProgressBar: {
    height: 6,
    backgroundColor: colors.gray200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  taskOverviewProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  taskBreakdown: {
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  taskBreakdownItem: {
    gap: spacing.xs,
  },
  taskBreakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs / 2,
  },
  taskBreakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  taskBreakdownLabel: {
    ...typography.styles.body,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  taskBreakdownValue: {
    ...typography.styles.h4,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    fontSize: 20,
  },
  taskBreakdownBar: {
    height: 4,
    backgroundColor: colors.gray200,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: spacing.xs / 2,
  },
  taskBreakdownBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  infoGroup: {
    marginBottom: spacing.md,
  },
  infoGroupTitle: {
    ...typography.styles.body,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontSize: 14,
  },
  listIcon: {
    fontSize: 20,
  },
  value: {
    ...typography.styles.body,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  irrigationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lifecycleHeader: {
    marginBottom: spacing.md,
  },
  lifecycleIndicatorContainer: {
    alignItems: 'flex-start',
  },
  lifecycleLabel: {
    ...typography.styles.body,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  lifecycleDates: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateCard: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateLabel: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
    fontSize: 11,
  },
  dateValue: {
    ...typography.styles.body,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  taskCard: {
    marginBottom: spacing.sm,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  taskTitleRow: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  taskTypeIcon: {
    fontSize: 24,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    ...typography.styles.body,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  taskType: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  taskDescription: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  taskDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  taskDateIcon: {
    fontSize: 14,
  },
  taskDateText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  taskDateSeparator: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  viewAllButton: {
    marginTop: spacing.sm,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
  errorText: {
    ...typography.styles.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});

export default FieldDetailScreen;

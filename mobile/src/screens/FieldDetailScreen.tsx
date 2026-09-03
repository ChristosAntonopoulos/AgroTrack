import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Linking, Alert, Pressable } from 'react-native';
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
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import InfoRow from '../components/ui/InfoRow';
import FieldDetailHeader from '../components/domain/FieldDetailHeader';
import FieldDetailToolbar from '../components/domain/FieldDetailToolbar';
import FieldPreviewHero from '../components/domain/FieldPreviewHero';
import FieldIntelligenceCard from '../components/domain/FieldIntelligenceCard';
import AlertBanner from '../components/ui/AlertBanner';
import LifecycleStageStepper from '../components/domain/LifecycleStageStepper';
import AgendaTaskRow from '../components/domain/AgendaTaskRow';
import GreekCadastreInfoCard from '../components/domain/GreekCadastreInfoCard';
import ActivityTimeline from '../components/domain/ActivityTimeline';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import OfflineBanner from '../components/OfflineBanner';
import { geospatialService, FieldEnvironmentalAlert } from '../services/geospatialService';
import { typography, spacing } from '../theme';
import { formatLocaleDate } from '../utils/formatters';
import { fieldHealthStatus, getAgendaTasks } from '../utils/dashboardUtils';
import { resolveFieldCenter, formatFieldArea } from '../utils/fieldGeo';
import { normalizeStage } from '../utils/lifecycleUtils';
import { isTaskOverdue } from '../utils/taskListUtils';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'FieldDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'FieldDetail'>;

const ALERT_ICONS: Record<string, React.ComponentProps<typeof AlertBanner>['icon']> = {
  frost: 'snow',
  heat: 'sunny',
  fireproximity: 'flame',
  vegetationchange: 'leaf',
  taskwarning: 'clipboard',
};

const SEVERE_ALERT_LEVELS = ['critical', 'high'];

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
  const [alerts, setAlerts] = useState<FieldEnvironmentalAlert[]>([]);
  const [cadastreExpanded, setCadastreExpanded] = useState(false);
  const [parentScrollEnabled, setParentScrollEnabled] = useState(true);
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

      try {
        const acts = await getActivityService().getActivities(fieldId, 10);
        setActivities(acts);
      } catch {
        setActivities([]);
      }

      // Warnings are raised and de-duplicated by the backend, so the device shows
      // exactly what the web app shows rather than re-deriving thresholds.
      setAlerts(resolveFieldCenter(fieldData) ? await geospatialService.getAlerts(fieldId) : []);
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
    const center = field ? resolveFieldCenter(field) : null;
    if (center) {
      Linking.openURL(`https://www.google.com/maps?q=${center.latitude},${center.longitude}`);
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

  const health = fieldHealthStatus(field, openTasks.length, overdueCount > 0);
  const fieldCenter = resolveFieldCenter(field);
  const hasMappableLocation = fieldCenter != null;
  const hasCadastre = Boolean(field.greekCadastre?.kaek || field.greekCadastre?.normalizedKaek);

  const toolbarActions = [
    {
      id: 'tasks',
      icon: 'list-outline' as const,
      label: t('fields:viewTasks'),
      onPress: () => goTab('Tasks'),
      badge: overdueCount > 0 ? overdueCount : openTasks.length > 0 ? openTasks.length : undefined,
    },
    {
      id: 'calendar',
      icon: 'calendar-outline' as const,
      label: t('fields:viewCalendar'),
      onPress: () => goTab('Calendar'),
    },
    {
      id: 'maps',
      icon: 'navigate-outline' as const,
      label: t('fields:openMaps'),
      onPress: openMaps,
      disabled: !hasMappableLocation,
    },
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
    <ScreenLayout scroll scrollEnabled={parentScrollEnabled} contentContainerStyle={styles.content}>
      <OfflineBanner />
      <FieldDetailHeader
        field={field}
        currentYear={currentYear}
        currentStage={currentStage}
        openTaskCount={openTasks.length}
        overdueCount={overdueCount}
        health={health}
      />

      <View style={styles.heroMapBlock}>
        <FieldPreviewHero
          field={field}
          mapHeight={300}
          onGestureActiveChange={(active) => setParentScrollEnabled(!active)}
        />
      </View>

      <View style={styles.toolbarWrap}>
        <FieldDetailToolbar actions={toolbarActions} />
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

      {alerts.map((alert) => (
        <View key={alert.id} style={styles.bannerWrap}>
          <AlertBanner
            variant={SEVERE_ALERT_LEVELS.includes(alert.severity?.toLowerCase()) ? 'error' : 'warning'}
            icon={ALERT_ICONS[alert.alertType?.toLowerCase()] ?? 'warning'}
            message={`${alert.title}: ${alert.message}`}
          />
        </View>
      ))}

      {field.boundary ? (
        <Section title={t('fields:intelligence.title')}>
          <FieldIntelligenceCard fieldId={field.id} />
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

      {hasCadastre ? (
        <View style={styles.cadastreSection}>
          <Pressable
            onPress={() => setCadastreExpanded((v) => !v)}
            style={[styles.cadastreHeader, { borderColor: colors.borderLight }]}
          >
            <Text style={[styles.cadastreHeaderText, { color: colors.textPrimary }]}>
              {t('fields:addField.cadastre.referenceTitle')}
            </Text>
            <Ionicons
              name={cadastreExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
          {cadastreExpanded && field.greekCadastre ? (
            <GreekCadastreInfoCard cadastre={field.greekCadastre} hideTitle />
          ) : null}
        </View>
      ) : null}

      <Section title={t('fields:fieldDetails')}>
        <Card>
          <InfoRow icon="leaf-outline" label={t('fields:fieldName')} value={field.name} />
          {field.status ? (
            <InfoRow icon="flag-outline" label={t('fields:status')} value={field.status} />
          ) : null}
          {field.variety ? (
            <InfoRow icon="nutrition-outline" label={t('fields:variety')} value={field.variety} />
          ) : null}
          <InfoRow icon="resize-outline" label={t('fields:area')} value={formatFieldArea(field)} />
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
          {fieldCenter ? (
            <InfoRow
              icon="location-outline"
              label={t('fields:coordinates')}
              value={`${fieldCenter.latitude.toFixed(4)}, ${fieldCenter.longitude.toFixed(4)}`}
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
  bannerWrap: { paddingHorizontal: spacing.base, marginBottom: spacing.xs },
  heroMapBlock: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  toolbarWrap: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  cadastreSection: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  cadastreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    marginBottom: spacing.sm,
  },
  cadastreHeaderText: {
    ...typography.styles.body,
    fontWeight: '700',
  },
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

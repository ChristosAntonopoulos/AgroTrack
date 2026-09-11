import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Pressable, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useRefresh } from '../hooks/useRefresh';
import { useTasks } from '../hooks/useTasks';
import { useFields } from '../hooks/useFields';
import { useDashboardWeather } from '../hooks/useDashboardWeather';
import { useRecentActivities } from '../hooks/useRecentActivities';
import ScreenLayout from '../components/layout/ScreenLayout';
import Section from '../components/layout/Section';
import DashboardQuickNav, { DashboardNavItem } from '../components/dashboard/DashboardQuickNav';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertBanner from '../components/ui/AlertBanner';
import AgendaTaskRow from '../components/domain/AgendaTaskRow';
import DashboardFieldCard from '../components/domain/DashboardFieldCard';
import WeatherWidget from '../components/domain/WeatherWidget';
import ActivityTimeline from '../components/domain/ActivityTimeline';
import HeroActionCard from '../components/dashboard/HeroActionCard';
import MyActionsStrip from '../components/dashboard/MyActionsStrip';
import NotesWidget from '../components/dashboard/NotesWidget';
import ActionSparkline from '../components/dashboard/ActionSparkline';
import PeriodChips from '../components/dashboard/PeriodChips';
import EmptyState from '../components/EmptyState';
import TutorialOverlay, { TutorialStep } from '../components/TutorialOverlay';
import { spacing } from '../theme';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { formatLocaleDate } from '../utils/formatters';
import { isTaskOverdue } from '../utils/taskListUtils';
import {
  countTasksDueThisWeek,
  countHighPriorityDueWeek,
  getAgendaTasks,
} from '../utils/dashboardUtils';
import { getMeDashboardService, getFinancialSummaryService } from '../services/serviceFactory';
import type { YearFinancialSummary } from '../services/financialSummaryService';
import { formatOfficialAmount } from '../finance/format';
import {
  emptyMeDashboard,
  MeDashboard,
  MeDashboardPeriod,
} from '../services/meDashboardService';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const DashboardScreen = () => {
  const { user, isFieldOwner } = useAuth();
  const capture = useCaptureOptional();
  const { colors } = useTheme();
  const { isFullPicture, fullTutorialSeen, markFullTutorialSeen, showWidget, tapMin } = usePreferences();
  const { t, i18n } = useTranslation(['dashboard', 'common', 'nav', 'tutorial', 'partners', 'fields', 'money']);
  const navigation = useNavigation<Nav>();
  const { stats, loading, refresh } = useDashboardStats();
  const { tasks } = useTasks();
  const { fields } = useFields();
  const { weather, loading: weatherLoading } = useDashboardWeather(fields);
  const { activities } = useRecentActivities(fields, tasks);
  const [period, setPeriod] = useState<MeDashboardPeriod>('week');
  const [meDashboard, setMeDashboard] = useState<MeDashboard>(emptyMeDashboard('week'));
  const [yearMoney, setYearMoney] = useState<YearFinancialSummary | null>(null);

  const loadMeDashboard = async (p: MeDashboardPeriod = period) => {
    try {
      const dash = await getMeDashboardService().getDashboard(p);
      setMeDashboard(dash);
    } catch {
      // keep cached/empty
    }
    if (isFullPicture && isFieldOwner()) {
      try {
        setYearMoney(
          await getFinancialSummaryService().getYear(new Date().getFullYear(), undefined, i18n.language)
        );
      } catch {
        setYearMoney(null);
      }
    }
  };

  const { refreshing, onRefresh } = useRefresh(async () => {
    await refresh();
    await loadMeDashboard(period);
  });

  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    void loadMeDashboard(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, user?.id]);

  useEffect(() => {
    if (isFullPicture && !fullTutorialSeen && !loading) {
      setShowTutorial(true);
    }
  }, [isFullPicture, fullTutorialSeen, loading]);

  const fullPictureSteps: TutorialStep[] = [
    {
      id: 'dashboard-overview',
      titleKey: 'full.step1.title',
      bodyKey: 'full.step1.body',
    },
    {
      id: 'field-control',
      titleKey: 'full.step2.title',
      bodyKey: 'full.step2.body',
    },
  ];

  const handleTutorialComplete = async () => {
    await markFullTutorialSeen();
    setShowTutorial(false);
  };

  const handleTutorialSkip = async () => {
    await markFullTutorialSeen();
    setShowTutorial(false);
  };

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
    () => tasks.filter((tk) => isTaskOverdue(tk)).length,
    [tasks]
  );

  const tasksDueWeek = useMemo(() => countTasksDueThisWeek(tasks), [tasks]);
  const highPriorityWeek = useMemo(() => countHighPriorityDueWeek(tasks), [tasks]);
  const agendaTasks = useMemo(() => getAgendaTasks(tasks, 5), [tasks]);
  const topFields = useMemo(() => fields.slice(0, 3), [fields]);
  const needsAttentionCount = overdueCount;

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

  const openTaskCount = useMemo(
    () => tasks.filter(tk => tk.status !== 'completed').length,
    [tasks]
  );

  const statusLine = useMemo(() => {
    if (overdueCount > 0) {
      return t('dashboard:quickNav.overdueHint', { count: overdueCount });
    }
    if (needsAttentionCount > 0 && owner) {
      return t('dashboard:quickNav.attentionHint', { count: needsAttentionCount });
    }
    if (tasksDueWeek > 0) {
      return t('dashboard:quickNav.weekHint', { count: tasksDueWeek });
    }
    return t('dashboard:quickNav.allClear');
  }, [overdueCount, needsAttentionCount, tasksDueWeek, owner, t]);

  const quickNavItems = useMemo((): DashboardNavItem[] => {
    if (!stats) return [];
    if (owner) {
      const fieldCount = stats.totalFields || fields.length;
      return [
        {
          id: 'fields',
          icon: 'leaf',
          label: t('dashboard:quickNav.fields'),
          hint: fieldCount > 0 ? t('dashboard:quickNav.fieldsHint', { count: fieldCount }) : t('dashboard:quickNav.addField'),
          onPress: () => goTab('Fields'),
        },
        {
          id: 'harvest',
          icon: 'basket',
          label: t('fields:thisHarvest.title'),
          hint: t('fields:thisHarvest.season', { year: new Date().getFullYear() }),
          onPress: () => navigation.navigate('ThisHarvest'),
        },
        {
          id: 'tasks',
          icon: 'checkbox-outline',
          label: t('dashboard:quickNav.tasks'),
          hint:
            openTaskCount > 0
              ? t('dashboard:quickNav.openHint', { count: openTaskCount })
              : t('dashboard:quickNav.noOpenTasks'),
          badge: needsAttentionCount > 0 ? needsAttentionCount : openTaskCount > 0 ? openTaskCount : undefined,
          urgent: needsAttentionCount > 0,
          onPress: () => goTab('Tasks'),
        },
        {
          id: 'partners',
          icon: 'people-circle-outline',
          label: t('partners:dashboardCta'),
          hint: t('partners:findPartner'),
          onPress: () => navigation.navigate('Partners'),
        },
      ];
    }
    return [
      {
        id: 'active',
        icon: 'sync',
        label: t('dashboard:quickNav.active'),
        hint: t('dashboard:quickNav.inProgressHint', { count: stats.inProgressTasks || 0 }),
        badge: stats.inProgressTasks || undefined,
        onPress: () => goTab('Tasks', { filter: 'in_progress' }),
      },
      {
        id: 'overdue',
        icon: 'alert-circle',
        label: t('dashboard:quickNav.overdue'),
        hint:
          overdueCount > 0
            ? t('dashboard:quickNav.overdueTileHint', { count: overdueCount })
            : t('dashboard:quickNav.onTrack'),
        badge: overdueCount > 0 ? overdueCount : undefined,
        urgent: overdueCount > 0,
        onPress: () => goTab('Tasks'),
      },
    ];
  }, [
    stats,
    owner,
    fields.length,
    tasksDueWeek,
    highPriorityWeek,
    openTaskCount,
    needsAttentionCount,
    overdueCount,
    t,
  ]);

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
      <DashboardQuickNav
        greeting={greeting}
        dateLabel={dateLabel}
        statusLine={statusLine}
        items={quickNavItems}
      />

      <ScreenLayout
        scroll
        style={styles.flex}
        refreshControl={{ refreshing, onRefresh }}
        contentContainerStyle={styles.scrollContent}
      >
        {showWidget('myActionsDetail') ? (
          <View style={styles.actionsWrap}>
            <PeriodChips period={period} onChange={setPeriod} tapMin={tapMin} />
          </View>
        ) : null}

        {showWidget('myActions') ? (
          <View style={styles.actionsWrap}>
            <HeroActionCard
              topAction={meDashboard.topAction}
              pending={meDashboard.pending}
              role={user.role}
              tapMin={tapMin}
              onPress={(target) => {
                if (target === 'CreateTask') {
                  if (capture) capture.openCapture();
                  else navigation.navigate('CreateTask', {});
                  return;
                }
                if (target === 'Partners') {
                  navigation.navigate('Partners');
                  return;
                }
                if (target === 'Today') {
                  navigation.navigate('Main', { screen: 'ChronologioTab' });
                  return;
                }
                goTab(target === 'Fields' ? 'Fields' : 'Tasks');
              }}
            />
            <MyActionsStrip
              data={meDashboard}
              density="full"
              period={period}
              tapMin={tapMin}
              onPressTile={(target) => {
                if (target === 'Partners') {
                  navigation.navigate('Partners');
                  return;
                }
                if (target === 'Today') {
                  navigation.navigate('Main', { screen: 'ChronologioTab' });
                  return;
                }
                goTab(target === 'Fields' ? 'Fields' : 'Tasks');
              }}
            />
          </View>
        ) : null}

        {showWidget('recentNotes') ? (
          <View style={styles.actionsWrap}>
            <NotesWidget
              limit={5}
              tapMin={tapMin}
              fieldNames={fieldNamesMap}
              fields={fields.map((f) => ({ id: f.id, name: f.name }))}
            />
          </View>
        ) : null}

        {showWidget('myActionsDetail') ? (
          <View style={styles.actionsWrap}>
            <ActionSparkline series={meDashboard.series} />
          </View>
        ) : null}

        {isFullPicture && owner ? (
          <Pressable
            onPress={() => navigation.navigate('Money')}
            style={[
              styles.moneyCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.borderLight,
                minHeight: tapMin,
              },
            ]}
          >
            <Text style={[styles.moneyLabel, { color: colors.textSecondary }]}>
              {t('dashboard:stats.thisYearCost')}
            </Text>
            <Text style={[styles.moneyValue, { color: colors.textPrimary }]}>
              {formatOfficialAmount(
                yearMoney?.totalExpenses,
                yearMoney?.currency || 'EUR',
                i18n.language,
                t('money:unknownAmount')
              )}
            </Text>
          </Pressable>
        ) : null}

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
            <ActivityTimeline
              activities={showWidget('myActions') ? (meDashboard.recent as any) : activities}
              fieldNames={fieldNamesMap}
              limit={showWidget('myActionsDetail') ? 8 : 4}
              onPressActivity={(act) => {
                if (act.taskId) {
                  navigation.navigate('TaskDetail', { taskId: act.taskId });
                } else if (act.fieldId) {
                  navigation.navigate('FieldDetail', { fieldId: act.fieldId });
                }
              }}
            />
          </View>
        ) : null}
      </ScreenLayout>

      <TutorialOverlay
        visible={showTutorial}
        steps={fullPictureSteps}
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialSkip}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: spacing['3xl'], paddingTop: spacing.xs },
  actionsWrap: { paddingHorizontal: spacing.base },
  moneyCard: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.base,
  },
  moneyLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  moneyValue: { fontSize: 22, fontWeight: '800' },
  bannerSection: { paddingHorizontal: spacing.base, marginBottom: spacing.sm },
  widgetRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
});

export default DashboardScreen;

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Field } from '../services/fieldService';
import { FieldTask, TaskProposal, isActiveFieldTask, type FieldPhenology } from '../services/fieldWorkService';
import type { YearFinancialSummary, FieldYearSummary } from '../services/financialSummaryService';
import type { ChronologioEntry } from '../services/chronologioService';
import type { FieldEnvironmentalAlert, FieldWeather } from '../services/geospatialService';
import { geospatialService } from '../services/geospatialService';
import {
  getFieldService,
  getFieldWorkService,
  getFinancialSummaryService,
  getChronologioService,
  getHarvestService,
} from '../services/serviceFactory';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import ScreenLayout from '../components/layout/ScreenLayout';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import FieldIdentity from '../components/fields/FieldIdentity';
import FieldMoreMenu from '../components/fields/FieldMoreMenu';
import FieldStatusStrip from '../components/fields/FieldStatusStrip';
import FieldYearGlance from '../components/fields/FieldYearGlance';
import FieldWeatherSection from '../components/fields/FieldWeatherSection';
import FieldRecentChronologio from '../components/fields/FieldRecentChronologio';
import FieldAttentionCard from '../components/fields/FieldAttentionCard';
import FieldFacts from '../components/fields/FieldFacts';
import FieldDetailMap from '../components/domain/FieldDetailMap';
import FieldIntelligenceCard from '../components/domain/FieldIntelligenceCard';
import FieldHarvestCard from '../components/domain/FieldHarvestCard';
import FieldLocalNavigation, { FieldTab } from '../components/fields/FieldLocalNavigation';
import FieldResultYearControl from '../components/fields/FieldResultYearControl';
import ChronologioScreen from './ChronologioScreen';
import type { HarvestRecord } from '../services/harvestService';
import { spacing } from '../theme';
import { getDockMetrics } from '../navigation/dockMetrics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  formatRelativeTime,
  isFieldSetupIncomplete,
  numberLocaleFor,
} from '../utils/fieldDisplay';
import {
  chronologioAttentionFallback,
  resolveFieldAttention,
  type FieldAttentionModel,
} from '../utils/fieldOverviewAttention';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'FieldDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'FieldDetail'>;

const athensYear = (): number =>
  Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', year: 'numeric' }).format(new Date())
  );

const parseTab = (mode?: string): FieldTab => {
  if (mode === 'map' || mode === 'details' || mode === 'chronologio') return mode;
  return 'overview';
};

const FieldDetailScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { fieldId, focus, mode: modeParam } = route.params;
  const { isFieldOwner, user } = useAuth();
  const capture = useCaptureOptional();
  const { colors, tapMin } = useTheme();
  const { t, i18n } = useTranslation(['fields', 'common', 'capture', 'chronologio']);
  const insets = useSafeAreaInsets();
  const { bottomInset, dockHeight } = getDockMetrics(tapMin, insets.bottom);
  const currentYear = athensYear();

  const [field, setField] = useState<Field | null>(null);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [proposals, setProposals] = useState<TaskProposal[]>([]);
  const [alerts, setAlerts] = useState<FieldEnvironmentalAlert[]>([]);
  const [phenology, setPhenology] = useState<FieldPhenology | null>(null);
  const [weather, setWeather] = useState<FieldWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);
  const [attention, setAttention] = useState<FieldAttentionModel | null>(null);
  const [dismissedAttentionIds, setDismissedAttentionIds] = useState<string[]>([]);
  const [costSummary, setCostSummary] = useState<YearFinancialSummary | null>(null);
  const [yearRollup, setYearRollup] = useState<FieldYearSummary | null>(null);
  const [plannedRemaining, setPlannedRemaining] = useState(0);
  const [recentEntries, setRecentEntries] = useState<ChronologioEntry[]>([]);
  const [harvestRecords, setHarvestRecords] = useState<HarvestRecord[]>([]);
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tab = parseTab(modeParam);

  const loadWeather = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError(false);
    try {
      const data = await geospatialService.getFieldWeather(fieldId);
      setWeather(data);
      setWeatherError(!data);
    } catch {
      setWeather(null);
      setWeatherError(true);
    } finally {
      setWeatherLoading(false);
    }
  }, [fieldId]);

  const load = useCallback(async () => {
    try {
      const finance = getFinancialSummaryService();
      const work = getFieldWorkService();
      const [fieldData, taskPlan, summary, rollup, chrono, fieldAlerts, fieldPhenology, harvests] =
        await Promise.all([
          getFieldService().getField(fieldId),
          work.getTaskPlan(fieldId, year).catch(() => null),
          finance.getYear(year, fieldId, i18n.language).catch(() => null),
          finance.getFieldYear(fieldId, year, i18n.language).catch(() => null),
          getChronologioService()
            .getFieldChronologio(fieldId, {
              limit: 8,
              from: `${year}-01-01`,
              to: `${year}-12-31`,
            })
            .catch(() => [] as ChronologioEntry[]),
          geospatialService.getAlerts(fieldId).catch(() => [] as FieldEnvironmentalAlert[]),
          work.getPhenology(fieldId).catch(() => null),
          getHarvestService().listByField(fieldId).catch(() => [] as HarvestRecord[]),
        ]);
      if (isFieldSetupIncomplete(fieldData.status)) {
        navigation.replace('FieldForm', { fieldId: fieldData.id });
        return;
      }
      const planTasks = Array.isArray(taskPlan?.tasks) ? taskPlan.tasks : [];
      const planProposals = Array.isArray(taskPlan?.proposals) ? taskPlan.proposals : [];
      const activeTasks = planTasks.filter(isActiveFieldTask);
      setField(fieldData);
      setTasks(activeTasks);
      setProposals(planProposals);
      setAlerts(Array.isArray(fieldAlerts) ? fieldAlerts : []);
      setPhenology(fieldPhenology);
      setPlannedRemaining(activeTasks.length);
      setCostSummary(summary);
      setYearRollup(rollup);
      setRecentEntries(chrono);
      setHarvestRecords(Array.isArray(harvests) ? harvests : []);
      setError(null);
    } catch {
      setError(t('fields:form.failedLoad'));
    } finally {
      setLoading(false);
    }
  }, [fieldId, year, t, i18n.language, navigation]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadWeather();
  }, [loadWeather]);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(CAPTURE_SAVED_EVENT, () => {
      void load();
    });
    return () => sub.remove();
  }, [load]);

  useEffect(() => {
    if (focus === 'money') {
      navigation.setParams({ focus: undefined });
      navigation.navigate('Money', { fieldId, year });
    }
  }, [fieldId, focus, navigation, year]);

  useEffect(() => {
    if (focus !== 'harvest' && focus !== 'harvest-final') return;
    navigation.setParams({ focus: undefined });
    capture?.openCapture({
      preferredType: 'harvest',
      fieldId,
    });
  }, [capture, fieldId, focus, navigation]);

  useEffect(() => {
    if (!field) {
      setAttention(null);
      return;
    }
    const locale = numberLocaleFor(i18n.language);
    let model = resolveFieldAttention({
      isDraft: field.status === 'Draft',
      isHistoricalYear: year < currentYear,
      alerts,
      tasks,
      proposals,
      language: i18n.language,
      dismissedIds: dismissedAttentionIds,
    });

    if (model.kind === 'none' && model.id !== 'draft') {
      const warningEntry = recentEntries.find(
        (entry) =>
          entry.importance === 'warning' ||
          entry.importance === 'critical' ||
          (entry.category === 'note' && entry.importance === 'important')
      );
      if (warningEntry && !dismissedAttentionIds.includes(warningEntry.id)) {
        const message =
          warningEntry.details.note?.bodyPreview || warningEntry.summary || '';
        model = chronologioAttentionFallback({
          title: warningEntry.title,
          message,
          entryId: warningEntry.id,
          whenLabel: formatRelativeTime(warningEntry.occurredAt, locale),
        });
      }
    }

    setAttention(model);
  }, [
    alerts,
    currentYear,
    dismissedAttentionIds,
    field,
    i18n.language,
    proposals,
    recentEntries,
    tasks,
    year,
  ]);

  const canOwn = Boolean(isFieldOwner() || field?.ownerId === user?.id);

  useEffect(() => {
    if (!field) return;
    navigation.setOptions({
      title: field.name,
      headerRight: () => (
        <FieldMoreMenu
          field={field}
          canOwn={canOwn}
          onDelete={
            canOwn
              ? () => {
                  Alert.alert(t('fields:deleteField'), t('fields:deleteConfirm'), [
                    { text: t('common:cancel'), style: 'cancel' },
                    {
                      text: t('common:delete'),
                      style: 'destructive',
                      onPress: () => {
                        void getFieldService()
                          .deleteField(fieldId)
                          .then(() => navigation.navigate('Main', { screen: 'Fields' }))
                          .catch(() => Alert.alert(t('fields:form.failedDelete')));
                      },
                    },
                  ]);
                }
              : undefined
          }
          onOpenChronologio={() => navigation.setParams({ mode: 'chronologio' })}
        />
      ),
    });
  }, [field, fieldId, navigation, canOwn, t]);

  const setTab = (next: FieldTab) => {
    navigation.setParams({ mode: next === 'overview' ? undefined : next });
  };

  const handleAttentionPrimary = useCallback(() => {
    if (!attention) return;
    switch (attention.primaryAction) {
      case 'task':
        if (attention.taskId) navigation.navigate('TaskDetail', { taskId: attention.taskId });
        break;
      case 'proposal':
        navigation.navigate('CreateTask', {
          fieldId,
          proposalId: attention.proposalId,
        });
        break;
      case 'tasks':
        navigation.navigate('Main', { screen: 'Tasks' });
        break;
      case 'chronologio':
        navigation.setParams({ mode: 'chronologio' });
        break;
      default:
        break;
    }
  }, [attention, fieldId, navigation]);

  useEffect(() => {
    setDismissedAttentionIds([]);
  }, [fieldId, year]);

  if (loading && !field) {
    return (
      <ScreenLayout>
        <LoadingSpinner fullScreen />
      </ScreenLayout>
    );
  }

  if (error || !field) {
    return (
      <ScreenLayout padded>
        <EmptyState
          title={error || t('fields:form.failedLoad')}
          action={{ label: t('fields:title'), onPress: () => navigation.navigate('Main', { screen: 'Fields' }) }}
        />
      </ScreenLayout>
    );
  }

  const openCapture = () => capture?.openCapture({ fieldId: field.id });

  const latestEntry = [...recentEntries].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  )[0];
  const isHistoricalYear = year < currentYear;
  const weatherNextTitle =
    attention?.kind === 'nextTask' || attention?.kind === 'weatherReschedule'
      ? attention.title
      : undefined;

  const renderMapPanel = () => (
    <ScrollView contentContainerStyle={styles.panel} showsVerticalScrollIndicator={false}>
      <FieldDetailMap field={field} height={360} />
      {field.boundary ? <FieldIntelligenceCard fieldId={field.id} /> : null}
    </ScrollView>
  );

  return (
    <ScreenLayout>
      <View style={styles.header}>
        {field.status === 'Draft' ? (
          <Text style={[styles.draft, { color: colors.warning }]}>{t('fields:page.draftField')}</Text>
        ) : null}
        <FieldIdentity field={field} size="page" hideTitle />
        <FieldResultYearControl year={year} onYearChange={setYear} />
      </View>

      <FieldLocalNavigation tab={tab} onTabChange={setTab} />

      {tab === 'chronologio' ? (
        <View style={styles.flex}>
          <ChronologioScreen fieldId={field.id} embedded />
        </View>
      ) : null}

      {tab === 'overview' ? (
        <ScrollView contentContainerStyle={styles.panel} showsVerticalScrollIndicator={false}>
          {attention ? (
            <FieldStatusStrip
              phenology={phenology}
              tasks={tasks}
              attention={attention}
              latestEntry={latestEntry}
              onOpenTask={(taskId) => navigation.navigate('TaskDetail', { taskId })}
              onOpenAttention={handleAttentionPrimary}
              onOpenChronologio={() => setTab('chronologio')}
            />
          ) : null}
          <FieldDetailMap field={field} height={220} showDataLayers={false} />
          {attention ? (
            <FieldAttentionCard
              attention={attention}
              onPrimary={handleAttentionPrimary}
              onKeepDate={(taskId) =>
                setDismissedAttentionIds((ids) => (ids.includes(taskId) ? ids : [...ids, taskId]))
              }
            />
          ) : null}
          <FieldWeatherSection
            fieldId={field.id}
            fieldName={field.name}
            fieldColor={field.color}
            weather={weather}
            loading={weatherLoading}
            error={weatherError}
            year={year}
            isHistoricalYear={isHistoricalYear}
            allowRecommendation={field.status !== 'Draft'}
            attention={attention}
            nextTaskTitle={weatherNextTitle}
            onRetry={() => void loadWeather()}
            onMoveTask={
              attention?.kind === 'weatherReschedule' && attention.taskId
                ? () => navigation.navigate('TaskDetail', { taskId: attention.taskId! })
                : undefined
            }
          />
          <FieldYearGlance
            year={year}
            costSummary={costSummary}
            yearRollup={yearRollup}
            plannedRemaining={plannedRemaining}
            onSeeFinance={() => navigation.navigate('Money', { fieldId: field.id, year })}
          />
          <FieldHarvestCard
            fieldId={field.id}
            records={harvestRecords}
            canAdd={field.status !== 'Draft'}
            canVoid={canOwn}
            onLogHarvest={() =>
              capture?.openCapture({ preferredType: 'harvest', fieldId: field.id })
            }
            onOpenCampaign={() => navigation.navigate('HarvestCampaign')}
            onVoid={async (id) => {
              await getHarvestService().void(id);
              await load();
            }}
          />
          <FieldRecentChronologio entries={recentEntries} onSeeAll={() => setTab('chronologio')} />
        </ScrollView>
      ) : null}

      {tab === 'map' ? renderMapPanel() : null}

      {tab === 'details' ? (
        <ScrollView contentContainerStyle={styles.panel} showsVerticalScrollIndicator={false}>
          <FieldFacts field={field} year={year} canOwn={canOwn} />
        </ScrollView>
      ) : null}

      {capture && tab !== 'details' && tab !== 'map' ? (
        <View style={[styles.stickyCapture, { bottom: dockHeight + bottomInset + spacing.sm }]}>
          <Button title={t('fields:page.capture')} onPress={openCapture} fullWidth />
        </View>
      ) : null}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  draft: {
    fontSize: 14,
    fontWeight: '700',
  },
  panel: {
    padding: spacing.base,
    gap: spacing.md,
    paddingBottom: spacing['3xl'] + 56,
  },
  stickyCapture: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
  },
});

export default FieldDetailScreen;

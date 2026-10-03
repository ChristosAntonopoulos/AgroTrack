import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  DeviceEventEmitter,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Field } from '../services/fieldService';
import {
  FieldTask,
  TaskProposal,
  isActiveFieldTask,
  type FieldPhenology,
  type FieldWorkProfile,
} from '../services/fieldWorkService';
import type { ChronologioEntry } from '../services/chronologioService';
import type { FieldEnvironmentalAlert, FieldWeather } from '../services/geospatialService';
import { geospatialService } from '../services/geospatialService';
import {
  getFieldService,
  getFieldWorkService,
  getChronologioService,
} from '../services/serviceFactory';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { useOwnerActivationOptional } from '../onboarding/OwnerActivationContext';
import SpatialLoadingPanel from '../components/onboarding/SpatialLoadingPanel';
import WorkSetupBanner from '../components/fields/WorkSetupBanner';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import { formatFieldArea } from '../utils/fieldGeo';
import ScreenLayout from '../components/layout/ScreenLayout';
import HeaderIconButton from '../components/layout/HeaderIconButton';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import FieldIdentity from '../components/fields/FieldIdentity';
import FieldMoreMenu from '../components/fields/FieldMoreMenu';
import FieldWeatherSection from '../components/fields/FieldWeatherSection';
import FieldFacts from '../components/fields/FieldFacts';
import GroveEnrichmentCards from '../components/fields/GroveEnrichmentCards';
import FieldDetailMap from '../components/domain/FieldDetailMap';
import FieldIntelligenceCard from '../components/domain/FieldIntelligenceCard';
import FieldWeatherVegetationCharts from '../components/fields/FieldWeatherVegetationCharts';
import FieldLocalNavigation, { FIELD_PAGE_TABS, FieldTab } from '../components/fields/FieldLocalNavigation';
import FieldHarvestYearsCard from '../components/fields/FieldHarvestYearsCard';
import FieldNextTasks from '../components/fields/FieldNextTasks';
import FieldQuickLinks from '../components/fields/FieldQuickLinks';
import FieldPageErrorBoundary from '../components/fields/FieldPageErrorBoundary';
import GroveWeatherCard from '../components/weather/GroveWeatherCard';
import GroveWeekForecast from '../components/weather/GroveWeekForecast';
import WeatherPeekSheet from '../components/weather/WeatherPeekSheet';
import { resolveFieldGates } from '../utils/fieldGates';
import { resolveFieldColor } from '../utils/fieldColors';
import { spacing } from '../theme';
import {
  formatRelativeTime,
  isFieldSetupIncomplete,
  numberLocaleFor,
} from '../utils/fieldDisplay';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import {
  chronologioAttentionFallback,
  resolveFieldAttention,
  type FieldAttentionModel,
} from '../utils/fieldOverviewAttention';
import { RootStackParamList } from '../navigation/types';
import { openChronologioForField, openHarvestCampaign } from '../navigation/intents';
import { agriculturalYearFor } from '../chronologio/agriculturalYear';
import {
  dismissWorkSetupBanner,
  isWorkSetupBannerDismissed,
  readWorkProfileDraft,
} from '../utils/fieldWorkProfileDraft';

type Route = RouteProp<RootStackParamList, 'FieldDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'FieldDetail'>;

const parseTab = (mode?: string): FieldTab => {
  if (mode === 'weather' || mode === 'details' || mode === 'field') return mode;
  // Legacy vegetation → weather & vegetation tab (plan alias)
  if (mode === 'vegetation') return 'weather';
  // Legacy map / overview / chronologio → field home
  return 'field';
};

const FieldDetailScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { fieldId, focus, mode: modeParam, activation: activationParam, groveReady } = route.params;
  const { user } = useAuth();
  const capture = useCaptureOptional();
  const activation = useOwnerActivationOptional();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation(['fields', 'common', 'capture', 'chronologio', 'tasks']);
  const year = agriculturalYearFor(new Date());

  const [field, setField] = useState<Field | null>(null);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [proposals, setProposals] = useState<TaskProposal[]>([]);
  const [alerts, setAlerts] = useState<FieldEnvironmentalAlert[]>([]);
  const [phenology, setPhenology] = useState<FieldPhenology | null>(null);
  const [weather, setWeather] = useState<FieldWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);
  const [weatherPeekOpen, setWeatherPeekOpen] = useState(false);
  const [attention, setAttention] = useState<FieldAttentionModel | null>(null);
  const [dismissedAttentionIds, setDismissedAttentionIds] = useState<string[]>([]);
  const [recentEntries, setRecentEntries] = useState<ChronologioEntry[]>([]);
  const [workProfile, setWorkProfile] = useState<FieldWorkProfile | null | undefined>(undefined);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
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
      const work = getFieldWorkService();
      const [
        fieldData,
        taskPlan,
        chrono,
        fieldAlerts,
        fieldPhenology,
        profile,
        dismissed,
        draft,
      ] = await Promise.all([
        getFieldService().getField(fieldId),
        work.getTaskPlan(fieldId, year).catch(() => null),
        getChronologioService()
          .getFieldChronologio(fieldId, {
            limit: 8,
            from: `${year}-01-01`,
            to: `${year}-12-31`,
          })
          .catch(() => [] as ChronologioEntry[]),
        geospatialService.getAlerts(fieldId).catch(() => [] as FieldEnvironmentalAlert[]),
        work.getPhenology(fieldId).catch(() => null),
        work.getWorkProfile(fieldId).catch(() => null),
        isWorkSetupBannerDismissed(fieldId),
        readWorkProfileDraft(fieldId),
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
      setRecentEntries(chrono);
      setWorkProfile(profile);
      setBannerDismissed(dismissed);
      setHasLocalDraft(Boolean(draft?.stepId));
      setError(null);
    } catch {
      setError(t('fields:form.failedLoad'));
    } finally {
      setLoading(false);
    }
  }, [fieldId, year, t, navigation]);

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
    openHarvestCampaign(navigation, { fieldId });
  }, [fieldId, focus, navigation]);

  useEffect(() => {
    if (!field) {
      setAttention(null);
      return;
    }
    const locale = numberLocaleFor(i18n.language);
    let model = resolveFieldAttention({
      isDraft: field.status === 'Draft',
      isHistoricalYear: false,
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
    dismissedAttentionIds,
    field,
    i18n.language,
    proposals,
    recentEntries,
    tasks,
  ]);

  const gates = useMemo(
    () =>
      resolveFieldGates({
        field,
        userId: user?.id,
        userRole: user?.role,
      }),
    [field, user?.id, user?.role]
  );
  const canOwn = gates.canOwn;
  const visibleTabs = FIELD_PAGE_TABS.filter((id) => {
    if (id === 'weather') return gates.canViewEnvironmentalData || gates.canViewMap;
    return true;
  });
  const showWorkSetupBanner =
    Boolean(canOwn) &&
    field?.status === 'Active' &&
    !bannerDismissed &&
    workProfile !== undefined &&
    (workProfile == null || workProfile.status === 'draft');

  const historyDetail = useMemo(() => {
    const latest = recentEntries[0];
    if (!latest) return undefined;
    const locale = numberLocaleFor(i18n.language);
    return `${latest.title} · ${formatRelativeTime(latest.occurredAt, locale)}`;
  }, [recentEntries, i18n.language]);

  useEffect(() => {
    if (!field) return;
    const title = friendlyFieldLabel(field.name);
    const accent = resolveFieldColor(field.color, field.id);
    navigation.setOptions({
      title,
      headerLeft: () => (
        <View style={styles.headerLeading}>
          <HeaderIconButton
            icon="chevron-back"
            paper
            compact
            accessibilityLabel={t('common:back')}
            onPress={() => navigation.goBack()}
          />
          <View
            style={[styles.headerColorDot, { backgroundColor: accent, borderColor: colors.surface }]}
            accessibilityElementsHidden
          />
        </View>
      ),
      headerRight: () => (
        <HeaderIconButton
          icon="ellipsis-horizontal"
          paper
          compact
          accessibilityLabel={t('common:actions', { defaultValue: 'More' })}
          onPress={() => setMoreOpen(true)}
        />
      ),
    });
  }, [field, navigation, t, colors.surface]);

  const setTab = (next: FieldTab) => {
    navigation.setParams({
      mode: next === 'field' ? undefined : next,
    });
  };

  useEffect(() => {
    if (tab === 'weather' && !gates.canViewEnvironmentalData && !gates.canViewMap) {
      navigation.setParams({ mode: undefined });
    }
  }, [tab, gates.canViewMap, gates.canViewEnvironmentalData, navigation]);

  useEffect(() => {
    setDismissedAttentionIds([]);
  }, [fieldId]);

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

  const weatherNextTitle =
    attention?.kind === 'nextTask' || attention?.kind === 'weatherReschedule'
      ? attention.title
      : undefined;

  const areaLocale = i18n.language?.startsWith('it')
    ? 'it'
    : i18n.language?.startsWith('en')
      ? 'en'
      : 'el';
  const readyArea = formatFieldArea(field, areaLocale);
  const showAttentionNudge =
    attention &&
    attention.kind !== 'none' &&
    attention.id !== 'draft';

  return (
    <ScreenLayout scroll contentContainerStyle={styles.scrollBody}>
      <FieldPageErrorBoundary label="Field page">
      <FieldLocalNavigation tab={tab} tabs={visibleTabs} onTabChange={setTab} />

      {tab === 'field' ? (
        <View style={styles.panel}>
          {field.status === 'Draft' ? (
            <Text style={[styles.draft, { color: colors.warning }]}>{t('fields:page.draftField')}</Text>
          ) : null}

          {groveReady &&
          !(
            activation?.eligible &&
            activation.completion.drawBoundary &&
            !activation.completion.loadData
          ) ? (
            <View
              style={[
                styles.readyBanner,
                { backgroundColor: colors.surface, borderColor: colors.borderLight },
              ]}
            >
              <Text style={[styles.readyTitle, { color: colors.textPrimary }]}>
                {t('fields:createGrove.readyTitle')}
              </Text>
              <Text style={[styles.readyBody, { color: colors.textSecondary }]}>
                {t('fields:createGrove.readyBody')}
              </Text>
              {readyArea && readyArea !== '—' ? (
                <Text style={[styles.readyBody, { color: colors.textPrimary }]}>
                  {t('fields:addField.boundaryAreaExplained', { area: readyArea })}
                </Text>
              ) : null}
              <Button
                title={t('chronologio:firstGrove.primary')}
                onPress={() => capture?.openCapture({ fieldId: field.id, sourcePage: 'grove' })}
                fullWidth
              />
            </View>
          ) : null}

          {(groveReady ||
            (activation?.eligible &&
              activation.completion.drawBoundary &&
              (activationParam === 'spatial' ||
                (!activation.completion.loadData && activation.celebrating)))) &&
          field ? (
            <SpatialLoadingPanel fieldId={fieldId} fieldName={field.name} />
          ) : null}

          {showWorkSetupBanner ? (
            <WorkSetupBanner
              fieldId={field.id}
              resume={hasLocalDraft || workProfile?.status === 'draft'}
              onDismiss={() => {
                void dismissWorkSetupBanner(field.id);
                setBannerDismissed(true);
              }}
            />
          ) : null}

          <FieldIdentity field={field} size="page" hideTitle showMeta />

          {gates.canViewMap ? (
            <FieldPageErrorBoundary label="Map">
              <FieldDetailMap field={field} height={300} showDataLayers />
            </FieldPageErrorBoundary>
          ) : null}

          <FieldPageErrorBoundary label="Harvest">
            <FieldHarvestYearsCard
              fieldId={field.id}
              onOpenHarvest={() => openHarvestCampaign(navigation, { fieldId: field.id })}
            />
          </FieldPageErrorBoundary>

          <FieldPageErrorBoundary label="Tasks">
            <FieldNextTasks
              tasks={tasks}
              fieldColor={field.color}
              fieldId={field.id}
              onOpenTask={(taskId) => navigation.navigate('TaskDetail', { taskId })}
              onSeeAll={() =>
                navigation.navigate('Main', {
                  screen: 'Tasks',
                  params: { fieldId: field.id, year: String(year) },
                })
              }
            />
          </FieldPageErrorBoundary>

          <FieldPageErrorBoundary label="Shortcuts">
            <FieldQuickLinks
              attentionTitle={showAttentionNudge ? attention?.title : null}
              onAttention={
                showAttentionNudge
                  ? () => {
                      if (attention?.taskId) {
                        navigation.navigate('TaskDetail', { taskId: attention.taskId });
                        return;
                      }
                      if (attention?.kind === 'weatherReschedule') {
                        setTab('weather');
                        return;
                      }
                      navigation.navigate('Main', {
                        screen: 'Tasks',
                        params: { fieldId: field.id, year: String(year) },
                      });
                    }
                  : undefined
              }
              canViewChronologio={gates.canViewChronologio}
              historyDetail={historyDetail}
              onHistory={() => openChronologioForField(navigation, field.id)}
              canManageAccess={gates.canManageAccess}
              onPeople={() => navigation.navigate('Partners', { fieldId: field.id })}
              showMyOil={gates.canOwn}
              onMyOil={() => navigation.navigate('MyOil', { field: field.id })}
            />
          </FieldPageErrorBoundary>
        </View>
      ) : null}

      {tab === 'weather' ? (
        <View style={styles.panel}>
          {gates.canViewEnvironmentalData ? (
            <View style={styles.heroWeather}>
              {weatherLoading && !weather ? (
                <ActivityIndicator color={colors.primary} />
              ) : weatherError || !weather ? (
                <Text style={{ color: colors.textSecondary }}>{t('fields:weather.unavailable')}</Text>
              ) : (
                <>
                  <GroveWeatherCard
                    fieldWeather={weather}
                    fieldName={field.name}
                    embedded
                    compact
                    onPress={() => setWeatherPeekOpen(true)}
                  />
                  <GroveWeekForecast fieldWeather={weather} variant="compact" />
                </>
              )}
            </View>
          ) : null}

          {gates.canViewEnvironmentalData ? (
            <FieldWeatherSection
              weather={weather}
              loading={weatherLoading}
              error={weatherError}
              year={year}
              isHistoricalYear={false}
              allowRecommendation={field.status !== 'Draft'}
              attention={attention}
              nextTaskTitle={weatherNextTitle}
              onRetry={() => void loadWeather()}
              onSeeCharts={undefined}
              onMoveTask={
                attention?.kind === 'weatherReschedule' && attention.taskId
                  ? () => navigation.navigate('TaskDetail', { taskId: attention.taskId! })
                  : undefined
              }
            />
          ) : null}

          {gates.canViewEnvironmentalData ? (
            <FieldWeatherVegetationCharts fieldId={field.id} focus="weather" />
          ) : null}
          {(gates.canViewMap || gates.canViewEnvironmentalData) ? (
            <FieldWeatherVegetationCharts fieldId={field.id} focus="vegetation" />
          ) : null}
          {field.boundary && gates.canViewEnvironmentalData ? (
            <FieldIntelligenceCard fieldId={field.id} />
          ) : null}
        </View>
      ) : null}

      {tab === 'details' ? (
        <View style={styles.panel}>
          <GroveEnrichmentCards field={field} canEdit={gates.canOwn} />
          <FieldFacts
            field={field}
            year={year}
            canOwn={canOwn}
            canViewSensitiveIdentity={gates.canViewSensitiveIdentity}
            canViewDocuments={gates.canViewDocuments}
            workProfile={workProfile}
            phenology={phenology}
          />
        </View>
      ) : null}

      <FieldMoreMenu
        field={field}
        hideTrigger
        open={moreOpen}
        onOpenChange={setMoreOpen}
        canEdit={gates.canOwn}
        canDelete={gates.canDelete}
        canManageAccess={gates.canManageAccess}
        canViewChronologio={gates.canViewChronologio}
        canViewPhotos={gates.canViewPhotos}
        canViewMap={gates.canViewMap}
        canViewEnvironmentalData={gates.canViewEnvironmentalData}
        onDelete={
          gates.canDelete
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
        onOpenChronologio={() => openChronologioForField(navigation, fieldId)}
      />

      {weatherPeekOpen ? (
        <WeatherPeekSheet
          open={weatherPeekOpen}
          onClose={() => setWeatherPeekOpen(false)}
          fields={[field]}
          primaryFieldId={field.id}
          seedSnapshot={null}
        />
      ) : null}
      </FieldPageErrorBoundary>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  scrollBody: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
  headerLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 4,
  },
  headerColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  draft: {
    fontSize: 14,
    fontWeight: '700',
  },
  readyBanner: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.base,
    gap: spacing.sm,
  },
  readyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  readyBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  heroWeather: {
    gap: spacing.sm,
  },
  panel: {
    paddingHorizontal: spacing.base,
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
});

export default FieldDetailScreen;

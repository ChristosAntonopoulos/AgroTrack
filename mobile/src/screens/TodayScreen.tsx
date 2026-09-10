import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { useTasks } from '../hooks/useTasks';
import { useRefresh } from '../hooks/useRefresh';
import { useDashboardWeather } from '../hooks/useDashboardWeather';
import { useCaptureOptional } from '../context/CaptureContext';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import TutorialOverlay, { TutorialStep } from '../components/TutorialOverlay';
import Button from '../components/ui/Button';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { getFieldService, getNoteService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { Note } from '../services/noteService';
import { isActiveFieldTask } from '../services/fieldWorkService';
import {
  buildAndRankProposals,
  buildConditionsStatus,
  buildTodayRoute,
  friendlyFieldLabel,
  kmhToBeaufort,
  partitionTasks,
  type BriefProposal,
} from '../today/buildDailyBrief';
import { dismissProposal, loadDismissedIds } from '../today/dismissStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const openDirections = (lat: number, lng: number) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  Linking.openURL(url);
};

const iconName = (p: BriefProposal): keyof typeof Ionicons.glyphMap => {
  if (p.icon === 'harvest') return 'leaf-outline';
  if (p.icon === 'weather') return 'rainy-outline';
  if (p.icon === 'observe') return 'eye-outline';
  return 'checkmark-circle-outline';
};

const TodayScreen = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier, everydayTutorialSeen, markEverydayTutorialSeen, isEveryday } =
    usePreferences();
  const { t, i18n } = useTranslation(['today', 'common']);
  const navigation = useNavigation<Nav>();
  const capture = useCaptureOptional();
  const { tasks, fields, loading, refresh } = useTasks();
  const [allFields, setAllFields] = useState<Field[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { weather } = useDashboardWeather(allFields.length > 0 ? allFields : Object.values(fields));
  const { refreshing, onRefresh } = useRefresh(async () => {
    await refresh();
    await reloadExtras();
  });
  const [showTutorial, setShowTutorial] = useState(false);

  const reloadExtras = useCallback(async () => {
    if (!user) return;
    try {
      const [flds, nts, dis] = await Promise.all([
        getFieldService().getFields(user.id, user.role),
        getNoteService().getNotes({ limit: 50 }).catch(() => [] as Note[]),
        loadDismissedIds(),
      ]);
      setAllFields(flds);
      setNotes(nts);
      setDismissed(dis);
    } catch {
      /* keep */
    }
  }, [user]);

  useEffect(() => {
    void reloadExtras();
  }, [reloadExtras]);

  useEffect(() => {
    if (isEveryday && !everydayTutorialSeen && !loading) setShowTutorial(true);
  }, [isEveryday, everydayTutorialSeen, loading]);

  const everydaySteps: TutorialStep[] = [
    { id: 'today-welcome', titleKey: 'everyday.step1.title', bodyKey: 'everyday.step1.body' },
    { id: 'next-action', titleKey: 'everyday.step2.title', bodyKey: 'everyday.step2.body' },
    { id: 'more-menu', titleKey: 'everyday.step3.title', bodyKey: 'everyday.step3.body' },
  ];

  const fieldList = allFields.length ? allFields : Object.values(fields);
  const fieldsById = useMemo(() => {
    const map: Record<string, Field | undefined> = { ...fields };
    for (const f of allFields) map[f.id] = f;
    return map;
  }, [fields, allFields]);

  const myOpenTasks = useMemo(
    () => tasks.filter((task) => isActiveFieldTask(task)),
    [tasks]
  );

  const { todayWork, overdue, nextTasks } = useMemo(
    () => partitionTasks(myOpenTasks),
    [myOpenTasks]
  );

  const rainConflict =
    (weather?.rainForecast24hMm ?? 0) >= 2 && todayWork.length > 0 ? todayWork.length : 0;

  const conditionsStatus = useMemo(
    () =>
      buildConditionsStatus({
        weather,
        overdueCount: overdue.length,
        rainConflictCount: rainConflict,
      }),
    [weather, overdue.length, rainConflict]
  );

  const ranked = useMemo(
    () =>
      buildAndRankProposals({
        fields: fieldList,
        notes,
        weather,
        todayWork,
        dismissedIds: dismissed,
      }),
    [fieldList, notes, weather, todayWork, dismissed]
  );

  const routeStops = useMemo(
    () => buildTodayRoute({ todayWork, fieldsById }),
    [todayWork, fieldsById]
  );

  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(i18n.language, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    [i18n.language]
  );

  const conditionsLine = useMemo(() => {
    if (!weather) return null;
    return [
      t('brief.conditions.temp', { temp: weather.temperature }),
      (weather.rainForecast24hMm ?? 0) >= 0.5 || weather.precipitation > 0
        ? t('brief.conditions.rainMm', {
            mm: Math.round(weather.rainForecast24hMm || weather.precipitation),
          })
        : t('brief.conditions.noRain'),
      t('brief.conditions.windBft', { bft: kmhToBeaufort(weather.windSpeed) }),
    ].join('   ');
  }, [weather, t]);

  const onDismiss = async (id: string) => {
    await dismissProposal(id, 7);
    setDismissed(await loadDismissedIds());
    setExpandedId((cur) => (cur === id ? null : cur));
  };

  const onProposalPrimary = (p: BriefProposal) => {
    if (p.primaryAction === 'capture') {
      capture?.openCapture({ preferredType: 'observation', fieldId: p.fieldId });
      return;
    }
    if (p.primaryAction === 'weather' && p.fieldId) {
      navigation.navigate('FieldDetail', { fieldId: p.fieldId });
      return;
    }
    navigation.navigate('CreateTask', { fieldId: p.fieldId });
  };

  const hasToday = todayWork.length > 0;
  const uniqueFields = new Set(todayWork.map((x) => x.fieldId)).size;
  const hasProposals = Boolean(ranked.featured);
  const calmEmpty = !hasToday && !hasProposals && nextTasks.length === 0;

  const ctaLabel = (p: BriefProposal) =>
    p.primaryAction === 'capture'
      ? t('brief.capture')
      : p.primaryAction === 'weather'
        ? t('brief.seeConditions')
        : t('brief.schedule');

  if (loading && tasks.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <ScreenLayout
      scroll
      refreshControl={{ refreshing, onRefresh }}
      contentContainerStyle={styles.content}
    >
      <ScreenHeader title={t('title')} subtitle={t('subtitle')} />
      <Text style={[styles.dateLine, { color: colors.textSecondary }]}>{dateLabel}</Text>
      <View style={styles.conditions}>
        {conditionsLine ? (
          <Text style={[styles.conditionsLine, { color: colors.textPrimary }]}>{conditionsLine}</Text>
        ) : null}
        <Text
          style={[
            styles.conditionsStatus,
            { color: conditionsStatus.alert ? '#8a5a12' : colors.textSecondary },
          ]}
        >
          {t(conditionsStatus.lineKey, conditionsStatus.lineParams)}
        </Text>
      </View>

      {calmEmpty ? (
        <View style={styles.section}>
          <View style={styles.positiveRow}>
            <Ionicons name="checkmark" size={16} color={colors.primary} />
            <Text style={{ color: colors.textSecondary }}>{t('brief.noTodayTasks')}</Text>
          </View>
          <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
            {t('brief.allQuietNone')}
          </Text>
          <Button
            title={t('brief.scheduleWork')}
            onPress={() => navigation.navigate('CreateTask', {})}
            style={{ minHeight: Math.max(tapMin, 44) }}
          />
        </View>
      ) : null}

      {!calmEmpty && !hasToday ? (
        <View style={[styles.positiveRow, { marginBottom: 16 }]}>
          <Ionicons name="checkmark" size={16} color={colors.primary} />
          <Text style={{ color: colors.textSecondary }}>{t('brief.noTodayTasks')}</Text>
        </View>
      ) : null}

      {hasToday ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('brief.todaySection')}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {t('brief.todaySummary', { tasks: todayWork.length, fields: uniqueFields })}
            </Text>
          </View>
          {todayWork.map((task) => {
            const due = task.plannedStart || task.plannedEnd;
            const time = due
              ? new Date(due).toLocaleTimeString(i18n.language, {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })
              : '—';
            const isOver = overdue.some((o) => o.id === task.id);
            return (
              <TouchableOpacity
                key={task.id}
                style={[styles.row, { minHeight: Math.max(tapMin, 44) }]}
                onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
              >
                <Text style={[styles.time, { color: colors.textSecondary }]}>
                  {isOver ? t('brief.overdueTag') : time}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontWeight: '700',
                      fontSize: 16 * fontScaleMultiplier,
                    }}
                  >
                    {task.title}
                  </Text>
                  <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                    {friendlyFieldLabel(fieldsById[task.fieldId]?.name)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {hasToday && routeStops.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {routeStops.length === 1 ? t('brief.destinationTitle') : t('brief.routeTitle')}
          </Text>
          {routeStops.map((stop, idx) => (
            <View key={stop.fieldId} style={[styles.routeStop, { minHeight: Math.max(tapMin, 44) }]}>
              {routeStops.length > 1 ? (
                <View style={[styles.routeN, { backgroundColor: colors.primary + '22' }]}>
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>{idx + 1}</Text>
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{stop.fieldName}</Text>
                <Text style={{ color: colors.textSecondary }}>{stop.taskTitle}</Text>
              </View>
              {stop.latitude != null && stop.longitude != null ? (
                <TouchableOpacity
                  onPress={() => openDirections(stop.latitude!, stop.longitude!)}
                  style={{ minHeight: Math.max(tapMin, 44), justifyContent: 'center' }}
                >
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('brief.directions')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {ranked.featured ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('brief.worthDoingNow')}
          </Text>

          <View
            style={[
              styles.featured,
              {
                borderColor: colors.primary + '55',
                backgroundColor: colors.primary + '0F',
              },
            ]}
          >
            <View style={styles.featuredTop}>
              <Ionicons name={iconName(ranked.featured)} size={18} color={colors.primary} />
              <Text style={[styles.featuredBadge, { color: colors.primary }]}>
                {hasToday ? t('brief.oleachronSuggestion') : t('brief.featuredBadge')}
              </Text>
            </View>
            <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 18 }}>
              {t(ranked.featured.titleKey)}
            </Text>
            {ranked.featured.fieldLabel ? (
              <Text style={{ color: colors.textSecondary, marginTop: 4, fontWeight: '600' }}>
                {ranked.featured.fieldLabel}
              </Text>
            ) : null}
            <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}>
              {t(ranked.featured.reasonKey, ranked.featured.reasonParams)}
            </Text>
            <View style={styles.featuredActions}>
              <Button
                title={ctaLabel(ranked.featured)}
                onPress={() => onProposalPrimary(ranked.featured!)}
                style={{ minHeight: Math.max(tapMin, 44), flex: 1 }}
              />
              <TouchableOpacity
                onPress={() => void onDismiss(ranked.featured!.id)}
                style={{ minHeight: Math.max(tapMin, 44), justifyContent: 'center', paddingHorizontal: 8 }}
              >
                <Text style={{ color: colors.textSecondary }}>{t('brief.notNow')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {ranked.secondary.length > 0 ? (
            <>
              <Text style={[styles.moreLabel, { color: colors.textSecondary }]}>
                {t('brief.moreProposals', { count: ranked.secondary.length })}
              </Text>
              {ranked.secondary.map((p) => {
                const open = expandedId === p.id;
                return (
                  <View key={p.id}>
                    <TouchableOpacity
                      style={[styles.secondaryHit, { minHeight: Math.max(tapMin, 44) }]}
                      onPress={() => setExpandedId((id) => (id === p.id ? null : p.id))}
                    >
                      <Ionicons name={iconName(p)} size={18} color={colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                          {t(p.titleKey)}
                        </Text>
                        {p.fieldLabel ? (
                          <Text style={{ color: colors.textSecondary }}>{p.fieldLabel}</Text>
                        ) : null}
                        <Text style={{ color: colors.textSecondary }}>
                          {t(p.reasonKey, p.reasonParams)}
                        </Text>
                      </View>
                      <Ionicons
                        name={open ? 'chevron-down' : 'chevron-forward'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    {open ? (
                      <View style={styles.expand}>
                        <View style={styles.featuredActions}>
                          <Button
                            title={ctaLabel(p)}
                            onPress={() => onProposalPrimary(p)}
                            style={{ minHeight: Math.max(tapMin, 44), flex: 1 }}
                          />
                          <TouchableOpacity
                            onPress={() => void onDismiss(p.id)}
                            style={{
                              minHeight: Math.max(tapMin, 44),
                              justifyContent: 'center',
                              paddingHorizontal: 8,
                            }}
                          >
                            <Text style={{ color: colors.textSecondary }}>{t('brief.notNow')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </>
          ) : null}
        </View>
      ) : null}

      {nextTasks.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('brief.nextSection')}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Main', { screen: 'Tasks' })}
              style={{ minHeight: Math.max(tapMin, 44), justifyContent: 'center' }}
            >
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {t('brief.seeAllTasks')} →
              </Text>
            </TouchableOpacity>
          </View>
          {nextTasks.map((task) => {
            const due = task.plannedStart || task.plannedEnd;
            return (
              <TouchableOpacity
                key={task.id}
                style={[styles.row, { minHeight: Math.max(tapMin, 44) }]}
                onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
              >
                <Text style={[styles.time, { color: colors.textSecondary }]}>
                  {due
                    ? new Date(due).toLocaleDateString(i18n.language, {
                        day: 'numeric',
                        month: 'short',
                      })
                    : '—'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{task.title}</Text>
                  <Text style={{ color: colors.textSecondary }}>
                    {friendlyFieldLabel(fieldsById[task.fieldId]?.name)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <TutorialOverlay
        visible={showTutorial}
        steps={everydaySteps}
        onComplete={async () => {
          await markEverydayTutorialSeen();
          setShowTutorial(false);
        }}
        onSkip={async () => {
          await markEverydayTutorialSeen();
          setShowTutorial(false);
        }}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  dateLine: {
    marginTop: -6,
    marginBottom: 12,
    fontSize: 15,
    textTransform: 'capitalize',
  },
  conditions: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  conditionsLine: { fontWeight: '700', fontSize: 15 },
  conditionsStatus: { marginTop: 6, fontSize: 14 },
  positiveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  section: { marginBottom: 22 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e0',
  },
  time: { width: 56, fontWeight: '700', fontSize: 12, paddingTop: 2 },
  routeStop: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  routeN: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featured: {
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: 12,
  },
  featuredTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  featuredBadge: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  featuredActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  moreLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 4,
  },
  secondaryHit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e0',
  },
  expand: { paddingBottom: 10 },
});

export default TodayScreen;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Button from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { useRefresh } from '../hooks/useRefresh';
import { useFields } from '../hooks/useFields';
import { reportsService, HarvestReportRecord } from '../services/reportsService';
import { getFieldWorkService, getNoteService, getFinancialSummaryService } from '../services/serviceFactory';
import { FieldTask } from '../services/fieldWorkService';
import { Note, notePreviewTitle } from '../services/noteService';
import { formatKg } from '../utils/harvestUtils';
import {
  formatSeasonLabel,
  getSeasonBounds,
  getSeasonStartYear,
  overlappingCalendarYears,
} from '../ravdos/season';
import {
  buildSeasonMilestones,
  computeRodProgress,
  noteInSeasonBounds,
  ROD_PHASE_ORDER,
  type RodPhaseId,
} from '../ravdos/progressModel';
import { RootStackParamList } from '../navigation/types';
import { spacing, typography } from '../theme';

import { formatOfficialAmount } from '../finance/format';
import type { YearFinancialSummary } from '../services/financialSummaryService';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ThisHarvestScreen = () => {
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier, isEveryday } = usePreferences();
  const { t, i18n } = useTranslation(['fields', 'common', 'money']);
  const navigation = useNavigation<Nav>();
  const { fields } = useFields();
  const seasonStartYear = useMemo(() => getSeasonStartYear(), []);
  const bounds = useMemo(() => getSeasonBounds(seasonStartYear), [seasonStartYear]);

  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [oliveKg, setOliveKg] = useState(0);
  const [yearMoney, setYearMoney] = useState<YearFinancialSummary | null>(null);
  const [showAll, setShowAll] = useState(false);

  const anyIrrigated = useMemo(() => fields.some((f) => Boolean(f.irrigationStatus)), [fields]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const years = overlappingCalendarYears(seasonStartYear);
      const [allTasks, allNotes, harvestChunks, officialYear] = await Promise.all([
        getFieldWorkService().listFieldTasks().catch(() => [] as FieldTask[]),
        getNoteService().getNotes({ limit: 100 }).catch(() => [] as Note[]),
        Promise.all(
          years.map((y) => reportsService.getHarvestRecords({ season: y }).catch(() => [] as HarvestReportRecord[]))
        ),
        getFinancialSummaryService()
          .getYear(new Date().getFullYear(), undefined, i18n.language)
          .catch(() => null),
      ]);

      const harvests = harvestChunks.flat().filter((h) => {
        const d = new Date(h.harvestDate);
        return !Number.isNaN(d.getTime()) && d >= bounds.from && d <= bounds.to;
      });
      setOliveKg(harvests.reduce((s, h) => s + (h.oliveKg || 0), 0));
      setYearMoney(officialYear);
      setTasks(allTasks);
      setNotes(
        allNotes
          .filter((n) => noteInSeasonBounds(n, bounds))
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, isEveryday ? 4 : 12)
      );
    } finally {
      setLoading(false);
    }
  }, [bounds, isEveryday, seasonStartYear, i18n.language]);

  useEffect(() => {
    void load();
  }, [load]);

  const { refreshing, onRefresh } = useRefresh(load);

  const progress = useMemo(() => {
    const milestones = buildSeasonMilestones(tasks, {
      anyIrrigatedField: anyIrrigated,
      seasonStartYear,
    });
    return computeRodProgress(milestones);
  }, [tasks, anyIrrigated, seasonStartYear]);

  const visible = useMemo(() => {
    if (showAll || !isEveryday) return progress.milestones;
    return progress.milestones.filter((m) => !m.done).slice(0, 5);
  }, [progress.milestones, showAll, isEveryday]);

  const toggle = async (taskId: string | undefined, done: boolean) => {
    if (!taskId || togglingId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const next = done ? 'planned' : 'completed';
    setTogglingId(taskId);
    setTasks((prev) => prev.map((r) => (r.id === taskId ? { ...r, status: next } : r)));
    try {
      if (done) {
        // Re-open is not supported via undo without execution id; keep optimistic planned.
      } else if (task.status === 'planned' || task.status === 'ready' || task.status === 'blocked') {
        await getFieldWorkService().startFieldTask(taskId);
        await getFieldWorkService().completeFieldTask(taskId, { outcome: 'done' });
        const refreshed = await getFieldWorkService().getFieldTask(taskId);
        setTasks((prev) => prev.map((r) => (r.id === taskId ? refreshed : r)));
      } else if (task.status === 'in_progress') {
        await getFieldWorkService().completeFieldTask(taskId, { outcome: 'done' });
        const refreshed = await getFieldWorkService().getFieldTask(taskId);
        setTasks((prev) => prev.map((r) => (r.id === taskId ? refreshed : r)));
      }
    } catch {
      setTasks((prev) => prev.map((r) => (r.id === taskId ? { ...r, status: task.status } : r)));
    } finally {
      setTogglingId(null);
    }
  };

  if (loading && tasks.length === 0) return <LoadingSpinner fullScreen />;

  const phaseLabel = (id: RodPhaseId) => t(`fields:thisHarvest.phases.${id}`);
  const empty =
    progress.milestones.length === 0 && notes.length === 0 && oliveKg === 0 && !yearMoney?.dataAvailability.hasPostedRecords;

  return (
    <ScreenLayout
      scroll
      refreshControl={{ refreshing, onRefresh }}
      contentContainerStyle={styles.content}
    >
      <ScreenHeader
        title={t('fields:thisHarvest.title')}
        subtitle={t('fields:thisHarvest.subtitle')}
      />
      <Text style={[styles.season, { color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier }]}>
        {t('fields:thisHarvest.season', { year: formatSeasonLabel(seasonStartYear) })}
      </Text>

      {empty ? (
        <EmptyState
          icon={<Ionicons name="leaf-outline" size={36} color={colors.textTertiary} />}
          title={t('fields:thisHarvest.emptyTitle')}
          description={t('fields:thisHarvest.emptyHint')}
        />
      ) : null}

      <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
        <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
          {t('fields:thisHarvest.progressLabel')}
        </Text>
        <Text style={[styles.percent, { color: colors.textPrimary, fontSize: 40 * fontScaleMultiplier }]}>
          {progress.percent}%
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier }}>
          {t('fields:thisHarvest.inProgress')} ·{' '}
          {t('fields:thisHarvest.phaseFocus', { phase: phaseLabel(progress.activePhaseId) })}
        </Text>
        {!isEveryday ? (
          <View style={styles.phases}>
            {ROD_PHASE_ORDER.map((id) => {
              const phase = progress.phases.find((p) => p.id === id);
              return (
                <View key={id} style={[styles.phase, { borderColor: colors.border }]}>
                  <Text style={{ color: colors.textPrimary, fontSize: 11 * fontScaleMultiplier, fontWeight: '700' }}>
                    {phaseLabel(id)}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier }}>
                    {phase?.percent ?? 0}%
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}>
          {t('fields:thisHarvest.milestonesTitle')}
        </Text>
        {visible.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>{t('fields:thisHarvest.milestonesEmpty')}</Text>
        ) : (
          visible.map((m) => (
            <View key={m.id} style={[styles.checkRow, { minHeight: Math.max(44, tapMin), borderColor: colors.borderLight }]}>
              <Pressable
                onPress={() => void toggle(m.taskId, m.done)}
                disabled={!m.taskId || togglingId === m.taskId}
                style={styles.checkBtn}
              >
                <Ionicons
                  name={m.done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={m.done ? colors.primaryDark : colors.textSecondary}
                />
              </Pressable>
              <TouchableOpacity
                style={{ flex: 1 }}
                disabled={!m.taskId}
                onPress={() => m.taskId && navigation.navigate('TaskDetail', { taskId: m.taskId })}
              >
                <Text
                  style={{
                    color: m.done ? colors.textSecondary : colors.textPrimary,
                    textDecorationLine: m.done ? 'line-through' : 'none',
                    fontWeight: '600',
                    fontSize: 15 * fontScaleMultiplier,
                  }}
                >
                  {m.title}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        {isEveryday && progress.milestones.filter((m) => !m.done).length > 5 ? (
          <Button
            title={
              showAll
                ? t('fields:thisHarvest.milestonesLess')
                : t('fields:thisHarvest.milestonesMore', {
                    count: progress.milestones.filter((m) => !m.done).length,
                  })
            }
            variant="ghost"
            onPress={() => setShowAll((v) => !v)}
          />
        ) : null}
      </View>

      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}>
          {t('fields:thisHarvest.notesTitle')}
        </Text>
        {notes.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>{t('fields:thisHarvest.notesEmpty')}</Text>
        ) : (
          notes.map((note) => (
            <TouchableOpacity
              key={note.id}
              style={{ minHeight: Math.max(44, tapMin), justifyContent: 'center' }}
              onPress={() =>
                note.fieldId
                  ? navigation.navigate('FieldDetail', { fieldId: note.fieldId })
                  : navigation.navigate('Chronologio')
              }
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                {(note.pinned ? '★ ' : '') +
                  (notePreviewTitle(note.body) || t('fields:thisHarvest.untitledNote'))}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}>
          {t('fields:thisHarvest.liveTitle')}
        </Text>
        <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>
          {t('fields:thisHarvest.liveHint')}
        </Text>
        <Text style={{ color: colors.textPrimary }}>
          {t('fields:thisHarvest.olivesSoFar')}: {t('fields:thisHarvest.kgValue', { kg: formatKg(oliveKg) })}
        </Text>
        <Text style={{ color: colors.textPrimary, marginBottom: spacing.sm }}>
          {t('fields:thisHarvest.spentSoFar')}:{' '}
          {formatOfficialAmount(
            yearMoney?.totalExpenses,
            yearMoney?.currency || 'EUR',
            i18n.language,
            t('money:unknownAmount')
          )}
        </Text>
        <Button
          title={t('fields:thisHarvest.openMoney')}
          variant="outline"
          onPress={() => navigation.navigate('Money')}
          fullWidth
        />
      </View>

      <Button
        title={t('fields:thisHarvest.reviewLink')}
        variant="ghost"
        onPress={() => navigation.navigate('ThisHarvestReview')}
        style={{ marginHorizontal: spacing.base }}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: spacing['3xl'] },
  season: { marginHorizontal: spacing.base, marginBottom: spacing.sm, fontWeight: '600' },
  card: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.base,
  },
  eyebrow: { ...typography.styles.caption, fontWeight: '700', textTransform: 'uppercase' },
  percent: { fontWeight: '800', marginVertical: 4 },
  phases: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  phase: { borderWidth: 1, borderRadius: 10, padding: 6, minWidth: '30%' },
  section: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  sectionTitle: { fontWeight: '700', marginBottom: spacing.xs },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

export default ThisHarvestScreen;

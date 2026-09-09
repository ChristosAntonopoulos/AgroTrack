import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
import { reportsService, HarvestReportRecord, FieldSummaryReport } from '../services/reportsService';
import { getTaskService, getNoteService } from '../services/serviceFactory';
import { Task } from '../services/taskService';
import { Note, notePreviewTitle } from '../services/noteService';
import { formatKg } from '../utils/harvestUtils';
import {
  formatSeasonLabel,
  getSeasonBounds,
  listRecentSeasonYears,
  overlappingCalendarYears,
} from '../ravdos/season';
import {
  buildSeasonMilestones,
  computeRodProgress,
  isSeasonClosedForReview,
  noteInSeasonBounds,
} from '../ravdos/progressModel';
import { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const formatMoney = (amount: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(amount);

const ThisHarvestReviewScreen = () => {
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier, isEveryday } = usePreferences();
  const { t } = useTranslation(['fields', 'common']);
  const navigation = useNavigation<Nav>();
  const { fields } = useFields();
  const anyIrrigated = useMemo(() => fields.some((f) => Boolean(f.irrigationStatus)), [fields]);

  const [loading, setLoading] = useState(true);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [closedYears, setClosedYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [oliveKg, setOliveKg] = useState(0);
  const [oilKg, setOilKg] = useState(0);
  const [spent, setSpent] = useState(0);
  const [received, setReceived] = useState(0);
  const [net, setNet] = useState(0);
  const [percent, setPercent] = useState(0);
  const [doneTitles, setDoneTitles] = useState<string[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [cards, setCards] = useState<
    Array<{ fieldId: string; fieldName: string; oliveKg: number; spent: number }>
  >([]);

  const discover = useCallback(async () => {
    setLoading(true);
    try {
      const tasks = await getTaskService().getAllTasks().catch(() => [] as Task[]);
      setAllTasks(tasks);
      const closed = listRecentSeasonYears(8).filter((y) => isSeasonClosedForReview(y, tasks));
      setClosedYears(closed);
      setSelectedYear((prev) => (prev && closed.includes(prev) ? prev : closed[0] ?? null));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void discover();
  }, [discover]);

  const loadYear = useCallback(
    async (year: number) => {
      const bounds = getSeasonBounds(year);
      const years = overlappingCalendarYears(year);
      const [allNotes, harvestChunks, pnlChunks, summaryChunks] = await Promise.all([
        getNoteService().getNotes({ limit: 100 }).catch(() => [] as Note[]),
        Promise.all(
          years.map((y) => reportsService.getHarvestRecords({ season: y }).catch(() => [] as HarvestReportRecord[]))
        ),
        Promise.all(years.map((y) => reportsService.getProfitLoss({ season: y }).catch(() => null))),
        Promise.all(
          years.map((y) => reportsService.getFieldSummaries({ season: y }).catch(() => [] as FieldSummaryReport[]))
        ),
      ]);

      const harvests = harvestChunks.flat().filter((h) => {
        const d = new Date(h.harvestDate);
        return !Number.isNaN(d.getTime()) && d >= bounds.from && d <= bounds.to;
      });
      const olives = harvests.reduce((s, h) => s + (h.oliveKg || 0), 0);
      const oil = harvests.reduce((s, h) => s + (h.oilKg || 0), 0);
      let spentSum = 0;
      let receivedSum = 0;
      const profitByField = new Map<string, { fieldName: string; cost: number; revenue: number }>();
      for (const pnl of pnlChunks) {
        if (!pnl) continue;
        spentSum += Number(pnl.totalExpenses ?? 0);
        receivedSum += Number(pnl.totalIncome ?? 0);
        for (const row of pnl.profitByField ?? []) {
          const prev = profitByField.get(row.fieldId);
          profitByField.set(row.fieldId, {
            fieldName: row.fieldName,
            cost: (prev?.cost ?? 0) + Number(row.cost ?? 0),
            revenue: (prev?.revenue ?? 0) + Number(row.revenue ?? 0),
          });
        }
      }

      const kgByField = new Map<string, number>();
      for (const h of harvests) {
        kgByField.set(h.fieldId, (kgByField.get(h.fieldId) ?? 0) + (h.oliveKg || 0));
      }
      const summaries = new Map<string, FieldSummaryReport>();
      summaryChunks.flat().forEach((s) => summaries.set(s.fieldId, s));

      const nextCards = Array.from(
        new Set([...kgByField.keys(), ...profitByField.keys(), ...summaries.keys()])
      )
        .map((fieldId) => ({
          fieldId,
          fieldName:
            summaries.get(fieldId)?.fieldName || profitByField.get(fieldId)?.fieldName || fieldId,
          oliveKg: kgByField.get(fieldId) ?? 0,
          spent: profitByField.get(fieldId)?.cost ?? 0,
        }))
        .filter((c) => c.oliveKg > 0 || c.spent > 0);

      const milestones = buildSeasonMilestones(allTasks, {
        anyIrrigatedField: anyIrrigated,
        seasonStartYear: year,
      });
      const progress = computeRodProgress(milestones);

      setOliveKg(olives);
      setOilKg(oil);
      setSpent(spentSum);
      setReceived(receivedSum);
      setNet(receivedSum - spentSum);
      setPercent(progress.percent);
      setDoneTitles(progress.milestones.filter((m) => m.done).map((m) => m.title));
      setCards(nextCards);
      setNotes(
        allNotes
          .filter((n) => noteInSeasonBounds(n, bounds))
          .slice(0, isEveryday ? 4 : 12)
      );
    },
    [allTasks, anyIrrigated, isEveryday]
  );

  useEffect(() => {
    if (selectedYear == null) return;
    void loadYear(selectedYear);
  }, [selectedYear, loadYear]);

  const { refreshing, onRefresh } = useRefresh(async () => {
    await discover();
    if (selectedYear != null) await loadYear(selectedYear);
  });

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScreenLayout
      scroll
      refreshControl={{ refreshing, onRefresh }}
      contentContainerStyle={styles.content}
    >
      <ScreenHeader title={t('fields:apologismos.title')} subtitle={t('fields:apologismos.subtitle')} />

      <Button
        title={t('fields:apologismos.backToProgress')}
        variant="ghost"
        onPress={() => navigation.navigate('ThisHarvest')}
        style={{ marginHorizontal: spacing.base }}
      />

      {closedYears.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="book-outline" size={36} color={colors.textTertiary} />}
          title={t('fields:apologismos.emptyYears')}
          description={t('fields:apologismos.emptyYearsHint')}
        />
      ) : (
        <>
          <Text style={[styles.label, { color: colors.textPrimary, marginHorizontal: spacing.base }]}>
            {t('fields:apologismos.pickYear')}
          </Text>
          <View style={styles.yearRow}>
            {closedYears.map((y) => (
              <TouchableOpacity
                key={y}
                onPress={() => setSelectedYear(y)}
                style={[
                  styles.yearChip,
                  {
                    minHeight: Math.max(44, tapMin),
                    backgroundColor: selectedYear === y ? colors.primaryDark : colors.surfaceMuted,
                    borderColor: selectedYear === y ? colors.primaryDark : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: selectedYear === y ? colors.textInverse : colors.textPrimary,
                    fontWeight: '700',
                    fontSize: 13 * fontScaleMultiplier,
                  }}
                >
                  {formatSeasonLabel(y)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('fields:apologismos.resultTitle')}
            </Text>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>
              {t('fields:apologismos.progressDone', { percent })}
            </Text>
            <Text style={{ color: colors.textPrimary }}>
              {t('fields:apologismos.olives')}: {formatKg(oliveKg)} kg
            </Text>
            <Text style={{ color: colors.textPrimary }}>
              {t('fields:apologismos.oil')}: {formatKg(oilKg)} kg
            </Text>
            <Text style={{ color: colors.textPrimary }}>
              {t('fields:apologismos.spent')}: {formatMoney(spent)}
            </Text>
            <Text style={{ color: colors.textPrimary }}>
              {t('fields:apologismos.received')}: {formatMoney(received)}
            </Text>
            <Text style={{ color: colors.textPrimary, fontWeight: '800', marginTop: 6, fontSize: 18 * fontScaleMultiplier }}>
              {t('fields:apologismos.net')}: {formatMoney(net)}
            </Text>
            <Button
              title={t('fields:apologismos.openMoney')}
              variant="outline"
              onPress={() => navigation.navigate('Money')}
              fullWidth
              style={{ marginTop: spacing.sm }}
            />
          </View>

          <View style={[styles.section, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('fields:apologismos.whatHappened')}
            </Text>
            {(isEveryday ? doneTitles.slice(0, 6) : doneTitles).map((title) => (
              <Text key={title} style={{ color: colors.textPrimary, paddingVertical: 4 }}>
                {title}
              </Text>
            ))}
          </View>

          <View style={[styles.section, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('fields:apologismos.notesTitle')}
            </Text>
            {notes.length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>{t('fields:apologismos.notesEmpty')}</Text>
            ) : (
              notes.map((note) => (
                <Text key={note.id} style={{ color: colors.textPrimary, paddingVertical: 4 }}>
                  {notePreviewTitle(note.body) || t('fields:thisHarvest.untitledNote')}
                </Text>
              ))
            )}
          </View>

          {!isEveryday
            ? cards.map((card) => (
                <TouchableOpacity
                  key={card.fieldId}
                  style={[
                    styles.fieldCard,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.borderLight,
                      minHeight: tapMin,
                    },
                  ]}
                  onPress={() => navigation.navigate('FieldDetail', { fieldId: card.fieldId })}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{card.fieldName}</Text>
                  <Text style={{ color: colors.textSecondary }}>
                    {formatKg(card.oliveKg)} kg
                    {card.spent > 0 ? ` · ${formatMoney(card.spent)}` : ''}
                  </Text>
                </TouchableOpacity>
              ))
            : null}
        </>
      )}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: spacing['3xl'] },
  label: { fontWeight: '600', marginBottom: spacing.xs },
  yearRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  yearChip: {
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  card: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.base,
    gap: 2,
  },
  section: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { fontWeight: '700', marginBottom: spacing.xs, fontSize: 17 },
  fieldCard: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
  },
});

export default ThisHarvestReviewScreen;

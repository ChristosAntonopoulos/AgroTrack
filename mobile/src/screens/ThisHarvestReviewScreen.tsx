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
import { reportsService, HarvestReportRecord } from '../services/reportsService';
import { getFieldWorkService, getNoteService, getFinancialSummaryService } from '../services/serviceFactory';
import { FieldTask } from '../services/fieldWorkService';
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

import { formatOfficialAmount } from '../finance/format';
import type { YearFinancialSummary } from '../services/financialSummaryService';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ThisHarvestReviewScreen = () => {
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier, isEveryday } = usePreferences();
  const { t, i18n } = useTranslation(['fields', 'common', 'money']);
  const navigation = useNavigation<Nav>();
  const { fields } = useFields();
  const anyIrrigated = useMemo(() => fields.some((f) => Boolean(f.irrigationStatus)), [fields]);

  const [loading, setLoading] = useState(true);
  const [allTasks, setAllTasks] = useState<FieldTask[]>([]);
  const [closedYears, setClosedYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [oliveKg, setOliveKg] = useState(0);
  const [oilKg, setOilKg] = useState(0);
  const [yearMoney, setYearMoney] = useState<YearFinancialSummary | null>(null);
  const [percent, setPercent] = useState(0);
  const [doneTitles, setDoneTitles] = useState<string[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [cards, setCards] = useState<
    Array<{ fieldId: string; fieldName: string; oliveKg: number }>
  >([]);

  const discover = useCallback(async () => {
    setLoading(true);
    try {
      const tasks = await getFieldWorkService().listFieldTasks().catch(() => [] as FieldTask[]);
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
      const [allNotes, harvestChunks, officialYear] = await Promise.all([
        getNoteService().getNotes({ limit: 100 }).catch(() => [] as Note[]),
        Promise.all(
          years.map((y) => reportsService.getHarvestRecords({ season: y }).catch(() => [] as HarvestReportRecord[]))
        ),
        getFinancialSummaryService()
          .getYear(year + 1, undefined, i18n.language)
          .catch(() => null),
      ]);

      const harvests = harvestChunks.flat().filter((h) => {
        const d = new Date(h.harvestDate);
        return !Number.isNaN(d.getTime()) && d >= bounds.from && d <= bounds.to;
      });
      const olives = harvests.reduce((s, h) => s + (h.oliveKg || 0), 0);
      const oil = harvests.reduce((s, h) => s + (h.oilKg || 0), 0);

      const kgByField = new Map<string, { fieldName: string; oliveKg: number }>();
      for (const h of harvests) {
        const prev = kgByField.get(h.fieldId);
        kgByField.set(h.fieldId, {
          fieldName: h.fieldName || prev?.fieldName || h.fieldId,
          oliveKg: (prev?.oliveKg ?? 0) + (h.oliveKg || 0),
        });
      }
      const nextCards = Array.from(kgByField.entries())
        .map(([fieldId, row]) => ({ fieldId, fieldName: row.fieldName, oliveKg: row.oliveKg }))
        .filter((c) => c.oliveKg > 0);

      const milestones = buildSeasonMilestones(allTasks, {
        anyIrrigatedField: anyIrrigated,
        seasonStartYear: year,
      });
      const progress = computeRodProgress(milestones);

      setOliveKg(olives);
      setOilKg(oil);
      setYearMoney(officialYear);
      setPercent(progress.percent);
      setDoneTitles(progress.milestones.filter((m) => m.done).map((m) => m.title));
      setCards(nextCards);
      setNotes(
        allNotes
          .filter((n) => noteInSeasonBounds(n, bounds))
          .slice(0, isEveryday ? 4 : 12)
      );
    },
    [allTasks, anyIrrigated, isEveryday, i18n.language]
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
                    backgroundColor: selectedYear === y ? colors.primaryLight : colors.surfaceMuted,
                    borderColor: selectedYear === y ? colors.oliveBorder : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: selectedYear === y ? colors.primary : colors.textPrimary,
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
              {t('fields:apologismos.spent')}:{' '}
              {formatOfficialAmount(
                yearMoney?.totalExpenses,
                yearMoney?.currency || 'EUR',
                i18n.language,
                t('money:unknownAmount')
              )}
            </Text>
            <Text style={{ color: colors.textPrimary }}>
              {t('fields:apologismos.received')}:{' '}
              {formatOfficialAmount(
                yearMoney?.totalIncome,
                yearMoney?.currency || 'EUR',
                i18n.language,
                t('money:unknownAmount')
              )}
            </Text>
            <Text style={{ color: colors.textPrimary, fontWeight: '800', marginTop: 6, fontSize: 18 * fontScaleMultiplier }}>
              {t('fields:apologismos.net')}:{' '}
              {formatOfficialAmount(
                yearMoney?.netResult,
                yearMoney?.currency || 'EUR',
                i18n.language,
                yearMoney?.resultLabel || t('money:unknownAmount')
              )}
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

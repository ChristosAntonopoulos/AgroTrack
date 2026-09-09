import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { getFieldService, getFinancialEntryService, getHarvestService, getTaskService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { FinancialEntry, UpdateFinancialEntryInput } from '../services/financialEntryService';
import { Task } from '../services/taskService';
import type { HarvestRecord } from '../services/harvestService';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import { fieldLabelMap, friendlyFieldLabel } from '../utils/fieldLabels';
import {
  economicsGroupFor,
  expenseBreakdown,
  filterByField,
  filterByYear,
  formatEconomicsMoney,
  formatSignedEconomics,
  groupMovements,
  harvestKgInYear,
  matchesSearch,
  monthlySeries,
  perFieldRows,
  summarizeEntries,
  yearsFromEntries,
} from '../utils/economics';
import { spacing, typography, radii } from '../theme';

type ViewMode = 'summary' | 'movements';
type KindFilter = 'all' | 'income' | 'expense';

const MoneyScreen = () => {
  const { t, i18n } = useTranslation(['economics', 'common']);
  const { colors } = useTheme();
  const { tapMin, isFullPicture } = usePreferences();
  const { user, isFieldOwner } = useAuth();
  const capture = useCaptureOptional();
  const route = useRoute();
  const routeFieldId = (route.params as { fieldId?: string } | undefined)?.fieldId || '';

  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<Field[]>([]);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [fieldId, setFieldId] = useState(routeFieldId);
  const [year, setYear] = useState(new Date().getFullYear());
  const [view, setView] = useState<ViewMode>('summary');
  const [kind, setKind] = useState<KindFilter>('all');
  const [query, setQuery] = useState('');
  const [taskFilter, setTaskFilter] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selected, setSelected] = useState<FinancialEntry | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ description: '', amount: '', notes: '' });
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  const reload = useCallback(async () => {
    const list = await getFieldService().getFields(user?.id || '', user?.role || '');
    setFields(list);
    const money = getFinancialEntryService();
    const harvestSvc = getHarvestService();
    const [batches, harvestRows, taskRows] = await Promise.all([
      Promise.all(list.map((f) => money.listByField(f.id).catch(() => [] as FinancialEntry[]))),
      Promise.all(list.map((f) => harvestSvc.listByField(f.id).catch(() => [] as HarvestRecord[]))),
      Promise.all(list.map((f) => getTaskService().getTasksByField(f.id).catch(() => [] as Task[]))),
    ]);
    const merged = batches.flat();
    setEntries(merged);
    setHarvests(harvestRows.flat());
    setTasks(taskRows.flat());
    const years = yearsFromEntries(merged);
    if (years[0] && !years.includes(year)) setYear(years[0]);
  }, [user?.id, user?.role, year]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        await reload();
      } finally {
        setLoading(false);
      }
    })();
  }, [reload]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(CAPTURE_SAVED_EVENT, () => {
      void reload();
    });
    return () => sub.remove();
  }, [reload]);

  useEffect(() => {
    if (routeFieldId) setFieldId(routeFieldId);
  }, [routeFieldId]);

  const fieldNames = useMemo(() => fieldLabelMap(fields), [fields]);
  const years = useMemo(() => yearsFromEntries(entries), [entries]);
  const scoped = useMemo(
    () => filterByField(filterByYear(entries, year), fieldId || undefined),
    [entries, fieldId, year]
  );
  const totals = useMemo(() => summarizeEntries(scoped), [scoped]);
  const breakdown = useMemo(() => expenseBreakdown(scoped), [scoped]);
  const visibleBars = showAllCategories ? breakdown : breakdown.slice(0, 5);
  const maxBar = breakdown[0]?.amount || 1;
  const fieldRows = useMemo(
    () => (fieldId ? null : perFieldRows(filterByYear(entries, year), fields)),
    [entries, fieldId, fields, year]
  );
  const recent = useMemo(() => scoped.slice(0, 5), [scoped]);
  const monthly = useMemo(
    () => (isFullPicture ? monthlySeries(scoped, year) : []),
    [isFullPicture, scoped, year]
  );
  const previous = useMemo(
    () => summarizeEntries(filterByField(filterByYear(entries, year - 1), fieldId || undefined)),
    [entries, fieldId, year]
  );
  const unit = useMemo(() => {
    if (!isFullPicture) return { costPerKg: null as number | null, harvestCostPerKg: null as number | null };
    const ids = fieldId ? [fieldId] : fields.map((f) => f.id);
    const kg = harvestKgInYear(harvests, ids, year);
    if (!(kg > 0) || !totals.hasExpenses) return { costPerKg: null, harvestCostPerKg: null };
    const harvestLinked = scoped.filter((e) => e.kind === 'expense' && e.harvestId);
    const harvestSpend = harvestLinked.reduce((sum, e) => sum + e.amount, 0);
    return {
      costPerKg: totals.expenses / kg,
      harvestCostPerKg: harvestLinked.length > 0 ? harvestSpend / kg : null,
    };
  }, [fieldId, fields, harvests, isFullPicture, scoped, totals, year]);
  const linkedTasks = useMemo(
    () => tasks.filter((task) => scoped.some((entry) => entry.taskId === task.id)),
    [scoped, tasks]
  );

  const movements = useMemo(() => {
    return scoped.filter((entry) => {
      if (kind !== 'all' && entry.kind !== kind) return false;
      if (taskFilter && entry.taskId !== taskFilter) return false;
      const label = t(`economics:groups.${economicsGroupFor(entry)}`);
      return matchesSearch(entry, query, fieldNames[entry.fieldId] || '', label);
    });
  }, [fieldNames, kind, query, scoped, t, taskFilter]);

  const months = useMemo(() => groupMovements(movements), [movements]);

  const canVoid = (entryFieldId: string) =>
    isFieldOwner() || fields.find((f) => f.id === entryFieldId)?.ownerId === user?.id;

  const openCapture = () => {
    capture?.openCapture({
      preferredType: 'expense',
      fieldId: fieldId || undefined,
    });
  };

  const handleVoid = async (id: string) => {
    try {
      await getFinancialEntryService().void(id);
      setSelected(null);
      await reload();
    } catch {
      Alert.alert(t('economics:deleteFailed'));
    }
  };

  const confirmVoid = (id: string) => {
    Alert.alert(t('economics:deleteTitle'), t('economics:deleteConfirm'), [
      { text: t('economics:cancel'), style: 'cancel' },
      {
        text: t('economics:delete'),
        style: 'destructive',
        onPress: () => void handleVoid(id),
      },
    ]);
  };

  const openSelected = (entry: FinancialEntry, startEditing = false) => {
    setSelected(entry);
    setEditing(startEditing);
    setDraft({
      description: entry.description,
      amount: String(entry.amount),
      notes: entry.notes || '',
    });
  };

  const handleUpdate = async () => {
    if (!selected) return;
    const amount = Number(draft.amount.replace(',', '.'));
    if (!draft.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      Alert.alert(t('economics:saveFailed'));
      return;
    }
    const input: UpdateFinancialEntryInput = {
      description: draft.description.trim(),
      amount,
      notes: draft.notes.trim() || undefined,
    };
    try {
      await getFinancialEntryService().update(selected.id, input);
      setEditing(false);
      setSelected(null);
      await reload();
    } catch {
      Alert.alert(t('economics:saveFailed'));
    }
  };

  const dashOr = (has: boolean, amount: number) =>
    has ? formatEconomicsMoney(amount, totals.currency, i18n.language) : t('economics:dash');

  const renderRow = (entry: FinancialEntry, showDate = false) => {
    const group = economicsGroupFor(entry);
    const signed =
      entry.kind === 'income'
        ? formatSignedEconomics(entry.amount, entry.currency, i18n.language, 'income')
        : formatSignedEconomics(-entry.amount, entry.currency, i18n.language, 'expense');
    return (
      <Pressable
        key={entry.id}
        onPress={() => openSelected(entry)}
        style={[styles.row, { borderBottomColor: colors.border, minHeight: tapMin }]}
      >
        <View style={styles.rowBody}>
          {showDate ? (
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(
                new Date(entry.occurredOn)
              )}
            </Text>
          ) : null}
          <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{entry.description}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            {t(`economics:groups.${group}`)}
            {' · '}
            {fieldNames[entry.fieldId] || friendlyFieldLabel('')}
          </Text>
        </View>
        <Text
          style={{
            color: entry.kind === 'income' ? colors.successDark : colors.textPrimary,
            fontWeight: '700',
          }}
        >
          {signed}
        </Text>
      </Pressable>
    );
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScreenLayout scroll padded>
      <ScreenHeader title={t('economics:title')} subtitle={t('economics:subtitle')} />

      {fields.length === 0 ? (
        <EmptyState
          title={t('economics:emptyFieldsTitle')}
          description={t('economics:emptyFieldsHint')}
        />
      ) : (
        <>
          <View style={styles.toolbar}>
            <Pressable
              onPress={() => setFieldPickerOpen(true)}
              style={[
                styles.select,
                { borderColor: colors.border, backgroundColor: colors.surfaceElevated, minHeight: tapMin },
              ]}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {fieldId ? fieldNames[fieldId] : t('economics:allFields')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setYearPickerOpen(true)}
              style={[
                styles.select,
                { borderColor: colors.border, backgroundColor: colors.surfaceElevated, minHeight: tapMin },
              ]}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{year}</Text>
            </Pressable>
          </View>

          <View style={[styles.tabs, { backgroundColor: colors.surfaceMuted }]}>
            {(['summary', 'movements'] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setView(mode)}
                style={[
                  styles.tab,
                  {
                    minHeight: tapMin,
                    backgroundColor: view === mode ? colors.surface : 'transparent',
                  },
                ]}
              >
                <Text
                  style={{
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    fontSize: 13,
                    color: view === mode ? colors.textPrimary : colors.textSecondary,
                  }}
                >
                  {t(`economics:${mode}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          {totals.count === 0 ? (
            <EmptyState
              title={t('economics:emptyTitle')}
              description={t('economics:emptyHint')}
              action={
                capture
                  ? { label: t('economics:captureCta'), onPress: openCapture }
                  : undefined
              }
            />
          ) : view === 'summary' ? (
            <View style={styles.stack}>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  {t('economics:resultYear', { year })}
                </Text>
                <Text
                  style={[
                    styles.hero,
                    {
                      color:
                        totals.result < 0
                          ? colors.textPrimary
                          : totals.result > 0
                            ? colors.successDark
                            : colors.textPrimary,
                    },
                  ]}
                >
                  {formatSignedEconomics(totals.result, totals.currency, i18n.language)}
                </Text>
                <View style={styles.split}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textSecondary }}>{t('economics:income')}</Text>
                    <Text style={{ color: colors.successDark, fontWeight: '700', fontSize: 18 }}>
                      {dashOr(totals.hasIncome, totals.income)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textSecondary }}>{t('economics:expenses')}</Text>
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 18 }}>
                      {dashOr(totals.hasExpenses, totals.expenses)}
                    </Text>
                  </View>
                </View>
                {isFullPicture && previous.count > 0 ? (
                  <Text style={{ color: colors.textSecondary, marginTop: spacing.sm }}>
                    {t('economics:prevYear')}: {year - 1} ·{' '}
                    {formatSignedEconomics(previous.result, previous.currency, i18n.language)}
                  </Text>
                ) : null}
              </View>

              {visibleBars.length > 0 ? (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    {t('economics:whereMoneyWent')}
                  </Text>
                  {visibleBars.map((row) => (
                    <View key={row.group} style={{ marginBottom: spacing.sm }}>
                      <View style={styles.barMeta}>
                        <Text style={{ color: colors.textPrimary }}>{t(`economics:groups.${row.group}`)}</Text>
                        <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                          {formatEconomicsMoney(row.amount, totals.currency, i18n.language)}
                        </Text>
                      </View>
                      <View style={[styles.barTrack, { backgroundColor: colors.surfaceMuted }]}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              width: `${Math.max(6, (row.amount / maxBar) * 100)}%`,
                              backgroundColor: colors.primary,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                  {breakdown.length > 5 ? (
                    <Pressable onPress={() => setShowAllCategories((v) => !v)} style={{ minHeight: tapMin }}>
                      <Text style={{ color: colors.primaryDark, fontWeight: '600' }}>
                        {showAllCategories ? t('economics:fewerCategories') : t('economics:allCategories')}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {fieldRows && fieldRows.length > 0 ? (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    {t('economics:perField')}
                  </Text>
                  {fieldRows.map((row) => (
                    <Pressable
                      key={row.fieldId}
                      onPress={() => setFieldId(row.fieldId)}
                      style={[styles.fieldRow, { borderBottomColor: colors.border, minHeight: tapMin }]}
                    >
                      <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{row.label}</Text>
                      <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                        {t('economics:income')} {dashOr(row.hasIncome, row.income)}
                        {' · '}
                        {t('economics:expenses')} {dashOr(row.hasExpenses, row.expenses)}
                      </Text>
                      <Text
                        style={{
                          marginTop: 4,
                          fontWeight: '700',
                          color: row.result < 0 ? colors.textPrimary : colors.successDark,
                        }}
                      >
                        {t('economics:result')}{' '}
                        {formatSignedEconomics(row.result, row.currency, i18n.language)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {isFullPicture && (unit.costPerKg != null || unit.harvestCostPerKg != null) ? (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    {t('economics:unitEconomics')}
                  </Text>
                  {unit.costPerKg != null ? (
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', marginBottom: 4 }}>
                      {t('economics:costPerKg')} {formatEconomicsMoney(unit.costPerKg, totals.currency, i18n.language)}
                      /kg
                    </Text>
                  ) : null}
                  {unit.harvestCostPerKg != null ? (
                    <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                      {t('economics:harvestCostPerKg')}{' '}
                      {formatEconomicsMoney(unit.harvestCostPerKg, totals.currency, i18n.language)}
                      /kg
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {isFullPicture && monthly.length > 0 ? (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    {t('economics:cashflow')}
                  </Text>
                  {monthly.map((m) => {
                    const label = new Intl.DateTimeFormat(i18n.language, { month: 'short' }).format(
                      new Date(year, m.month - 1, 1)
                    );
                    return (
                      <View key={m.month} style={styles.monthRow}>
                        <Text style={{ width: 40, color: colors.textSecondary }}>{label}</Text>
                        <Text style={{ flex: 1, color: colors.textPrimary }}>
                          {m.hasIncome
                            ? formatEconomicsMoney(m.income, totals.currency, i18n.language)
                            : t('economics:dash')}
                        </Text>
                        <Text style={{ flex: 1, color: colors.textPrimary }}>
                          {m.hasExpenses
                            ? formatEconomicsMoney(m.expenses, totals.currency, i18n.language)
                            : t('economics:dash')}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  {t('economics:recent')}
                </Text>
                {recent.map((e) => renderRow(e, true))}
                <Pressable onPress={() => setView('movements')} style={{ minHeight: tapMin, marginTop: spacing.sm }}>
                  <Text style={{ color: colors.primaryDark, fontWeight: '600' }}>
                    {t('economics:allMovements')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.stack}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('economics:search')}
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.search,
                  {
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    backgroundColor: colors.surfaceElevated,
                    minHeight: tapMin,
                  },
                ]}
              />
              <View style={styles.kindRow}>
                {(
                  [
                    ['all', 'kindAll'],
                    ['income', 'kindIncome'],
                    ['expense', 'kindExpenses'],
                  ] as const
                ).map(([key, label]) => (
                  <Pressable
                    key={key}
                    onPress={() => setKind(key)}
                    style={[
                      styles.kindChip,
                      {
                        minHeight: tapMin,
                        borderColor: kind === key ? colors.primary : colors.border,
                        backgroundColor:
                          kind === key ? colors.primary + '18' : colors.surfaceElevated,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontWeight: '600',
                        color: kind === key ? colors.primaryDark : colors.textSecondary,
                      }}
                    >
                      {t(`economics:${label}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {linkedTasks.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kindRow}>
                  <Pressable
                    onPress={() => setTaskFilter('')}
                    style={[
                      styles.kindChip,
                      {
                        minHeight: tapMin,
                        borderColor: !taskFilter ? colors.primary : colors.border,
                        backgroundColor: !taskFilter ? colors.primary + '18' : colors.surfaceElevated,
                      },
                    ]}
                  >
                    <Text style={{ fontWeight: '600', color: !taskFilter ? colors.primaryDark : colors.textSecondary }}>
                      {t('economics:allTasks')}
                    </Text>
                  </Pressable>
                  {linkedTasks.map((task) => (
                    <Pressable
                      key={task.id}
                      onPress={() => setTaskFilter(task.id)}
                      style={[
                        styles.kindChip,
                        {
                          minHeight: tapMin,
                          borderColor: taskFilter === task.id ? colors.primary : colors.border,
                          backgroundColor:
                            taskFilter === task.id ? colors.primary + '18' : colors.surfaceElevated,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontWeight: '600',
                          color: taskFilter === task.id ? colors.primaryDark : colors.textSecondary,
                        }}
                        numberOfLines={1}
                      >
                        {task.title}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}

              {months.length === 0 ? (
                <EmptyState title={t('economics:emptyTitle')} description={t('economics:emptyHint')} />
              ) : (
                months.map((month) => (
                  <View key={month.key} style={{ marginBottom: spacing.md }}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                      {new Intl.DateTimeFormat(i18n.language, {
                        month: 'long',
                        year: 'numeric',
                      })
                        .format(new Date(month.year, month.month - 1, 1))
                        .toLocaleUpperCase(i18n.language)}
                    </Text>
                    {month.days.map((day) => (
                      <View key={day.key}>
                        <Text style={{ fontWeight: '700', color: colors.textPrimary, marginTop: spacing.sm }}>
                          {new Intl.DateTimeFormat(i18n.language, {
                            day: 'numeric',
                            month: 'short',
                          }).format(day.date)}
                        </Text>
                        {day.entries.map((e) => renderRow(e))}
                      </View>
                    ))}
                  </View>
                ))
              )}
            </View>
          )}
        </>
      )}

      <Modal visible={fieldPickerOpen} transparent animationType="fade" onRequestClose={() => setFieldPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFieldPickerOpen(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Pressable
              onPress={() => {
                setFieldId('');
                setFieldPickerOpen(false);
              }}
              style={{ minHeight: tapMin, justifyContent: 'center' }}
            >
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{t('economics:allFields')}</Text>
            </Pressable>
            {fields.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => {
                  setFieldId(f.id);
                  setFieldPickerOpen(false);
                }}
                style={{ minHeight: tapMin, justifyContent: 'center' }}
              >
                <Text style={{ color: colors.textPrimary }}>{friendlyFieldLabel(f.name)}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={yearPickerOpen} transparent animationType="fade" onRequestClose={() => setYearPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setYearPickerOpen(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            {years.map((y) => (
              <Pressable
                key={y}
                onPress={() => {
                  setYear(y);
                  setYearPickerOpen(false);
                }}
                style={{ minHeight: tapMin, justifyContent: 'center' }}
              >
                <Text style={{ fontWeight: year === y ? '700' : '500', color: colors.textPrimary }}>{y}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <ScrollView>
              {selected ? (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    {selected.kind === 'income' ? t('economics:incomeLabel') : t('economics:expense')}
                  </Text>
                  <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{selected.description}</Text>
                  <Text
                    style={{
                      fontSize: 28,
                      fontWeight: '700',
                      color: selected.kind === 'income' ? colors.successDark : colors.textPrimary,
                      marginBottom: spacing.sm,
                    }}
                  >
                    {selected.kind === 'income'
                      ? formatSignedEconomics(selected.amount, selected.currency, i18n.language, 'income')
                      : formatSignedEconomics(-selected.amount, selected.currency, i18n.language, 'expense')}
                  </Text>
                  <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
                    {new Intl.DateTimeFormat(i18n.language, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }).format(new Date(selected.occurredOn))}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>{t('economics:category')}</Text>
                  <Text style={{ fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm }}>
                    {t(`economics:groups.${economicsGroupFor(selected)}`)}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>{t('economics:field')}</Text>
                  <Text style={{ fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm }}>
                    {fieldNames[selected.fieldId]}
                  </Text>
                  {selected.notes ? (
                    <>
                      <Text style={{ color: colors.textSecondary }}>{t('economics:notes')}</Text>
                      <Text style={{ fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm }}>
                        {selected.notes}
                      </Text>
                    </>
                  ) : null}
                  {canVoid(selected.fieldId) ? (
                    <>
                      {editing ? (
                        <>
                          <Text style={{ color: colors.textSecondary }}>{t('economics:entryTitle')}</Text>
                          <TextInput
                            value={draft.description}
                            onChangeText={(description) => setDraft((d) => ({ ...d, description }))}
                            style={[
                              styles.search,
                              {
                                borderColor: colors.border,
                                color: colors.textPrimary,
                                marginTop: 4,
                                marginBottom: spacing.sm,
                              },
                            ]}
                          />
                          <Text style={{ color: colors.textSecondary }}>{t('economics:amount')}</Text>
                          <TextInput
                            value={draft.amount}
                            onChangeText={(amount) => setDraft((d) => ({ ...d, amount }))}
                            keyboardType="decimal-pad"
                            style={[
                              styles.search,
                              {
                                borderColor: colors.border,
                                color: colors.textPrimary,
                                marginTop: 4,
                                marginBottom: spacing.sm,
                              },
                            ]}
                          />
                          <Text style={{ color: colors.textSecondary }}>{t('economics:notes')}</Text>
                          <TextInput
                            value={draft.notes}
                            onChangeText={(notes) => setDraft((d) => ({ ...d, notes }))}
                            style={[
                              styles.search,
                              {
                                borderColor: colors.border,
                                color: colors.textPrimary,
                                marginTop: 4,
                                marginBottom: spacing.sm,
                              },
                            ]}
                          />
                          <Button title={t('economics:save')} onPress={() => void handleUpdate()} />
                        </>
                      ) : (
                        <Button
                          title={t('economics:correct')}
                          variant="outline"
                          onPress={() => setEditing(true)}
                          style={{ marginTop: spacing.md }}
                        />
                      )}
                      <Button
                        title={t('economics:delete')}
                        variant="outline"
                        onPress={() => confirmVoid(selected.id)}
                        style={{ marginTop: spacing.sm }}
                      />
                    </>
                  ) : null}
                  <Button
                    title={t('economics:cancel')}
                    variant="outline"
                    onPress={() => {
                      setEditing(false);
                      setSelected(null);
                    }}
                    style={{ marginTop: spacing.sm }}
                  />
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  select: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: radii.md,
    padding: 4,
    marginBottom: spacing.md,
    gap: 4,
  },
  tab: {
    flex: 1,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: { gap: spacing.md },
  card: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  sectionLabel: {
    ...typography.styles.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  hero: { fontSize: 36, fontWeight: '700', marginBottom: spacing.md },
  split: { flexDirection: 'row', gap: spacing.md },
  barMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  fieldRow: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontWeight: '600' },
  search: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  kindChip: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  monthRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: 4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: { borderRadius: radii.md, padding: spacing.md, gap: spacing.xs },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
  },
  sheetTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
});

export default MoneyScreen;

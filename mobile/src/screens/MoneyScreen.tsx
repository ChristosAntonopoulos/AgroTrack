import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Share,
  DeviceEventEmitter,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import HeaderIconButton from '../components/layout/HeaderIconButton';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Sheet from '../components/ui/Sheet';
import DismissibleChip from '../components/ui/DismissibleChip';
import FieldColorMark from '../components/fields/FieldColorMark';
import MoneyContextBar, { type MoneyKindFilter } from '../components/money/MoneyContextBar';
import MoneyTabs, { type MoneyPageTab } from '../components/money/MoneyTabs';
import MoneyCycleBar from '../components/money/MoneyCycleBar';
import MoneyStatGrid from '../components/money/MoneyStatGrid';
import MoneyTrustStrip from '../components/money/MoneyTrustStrip';
import MoneyMonthStrip from '../components/money/MoneyMonthStrip';
import MoneyFieldRows from '../components/money/MoneyFieldRows';
import MoneyCategoryBreakdown from '../components/money/MoneyCategoryBreakdown';
import MoneyExpandableSection from '../components/money/MoneyExpandableSection';
import OliveOilEconomicsCard from '../components/money/OliveOilEconomicsCard';
import MoneyTransactionRow from '../components/money/MoneyTransactionRow';
import MoneyTransactionDrawer from '../components/money/MoneyTransactionDrawer';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { useRegisterCapturePage } from '../context/CapturePageContext';
import {
  getFieldService,
  getFieldWorkService,
  getFinancialSummaryService,
  getFinancialTransactionService,
  getHarvestService,
} from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import type { FinancialTransaction } from '../services/financialTransactionService';
import type { YearFinancialSummary } from '../services/financialSummaryService';
import { oilStockService, type OilLot } from '../services/oilStockService';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import { fieldLabelMap, friendlyFieldLabel } from '../utils/fieldLabels';
import { overlayUnassignedSummary, UNASSIGNED_FIELD_QUERY } from '../finance/buildYearSummary';
import { formatOfficialAmount, isForbiddenError, perAreaForDisplay } from '../finance/format';
import { financialCategoryLabel, unassignedFieldLabel } from '../finance/display';
import { moneyLedgerCsv } from '../finance/moneyExport';
import { formatRelatedHarvestLabel } from '../finance/relatedHarvestLabel';
import {
  currentHarvestStage,
  harvestMonthTitle,
  harvestYearRangeLabel,
  harvestYearSpan,
  harvestYearStatus,
} from '../finance/harvestYear';
import { agriculturalYearFor } from '../chronologio/agriculturalYear';
import type { RootStackParamList } from '../navigation/types';
import { createElevation, radii, spacing, typography } from '../theme';

const PAGE_SIZE = 20;

const MoneyScreen = () => {
  const { t, i18n } = useTranslation(['money', 'capture', 'common']);
  const { colors, tapMin } = useTheme();
  const { user } = useAuth();
  const capture = useCaptureOptional();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const routeParams = route.params as { fieldId?: string; year?: number; tx?: string } | undefined;
  const routeFieldId = routeParams?.fieldId || '';
  const routeYear = routeParams?.year;
  const routeTx = routeParams?.tx || '';

  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<Field[]>([]);
  const [summary, setSummary] = useState<YearFinancialSummary | null>(null);
  const [summaryForbidden, setSummaryForbidden] = useState(false);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [fieldId, setFieldId] = useState(routeFieldId);

  useRegisterCapturePage({
    sourcePage: 'money',
    fieldId: fieldId && fieldId !== UNASSIGNED_FIELD_QUERY ? fieldId : undefined,
  });
  const [year, setYear] = useState(
    typeof routeYear === 'number' && Number.isFinite(routeYear)
      ? routeYear
      : agriculturalYearFor(new Date())
  );
  const [month, setMonth] = useState(0);
  const [category, setCategory] = useState('');
  const [kind, setKind] = useState<MoneyKindFilter>('all');
  const [tab, setTab] = useState<MoneyPageTab>('overview');
  const [selected, setSelected] = useState<FinancialTransaction | null>(null);
  const [relatedTitles, setRelatedTitles] = useState<{ task?: string; harvest?: string }>({});
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [oilLots, setOilLots] = useState<OilLot[]>([]);

  const unknown = t('money:unknownAmount');
  const locale = i18n.language;
  const span = harvestYearSpan(year);
  const yearStatus = harvestYearStatus(year);
  const seasonLine =
    yearStatus === 'current' ? t(`money:seasonLine.${currentHarvestStage()}`) : null;

  const listParams = useCallback(
    () => ({
      resultYear: year,
      fieldId: fieldId && fieldId !== UNASSIGNED_FIELD_QUERY ? fieldId : undefined,
      type: kind === 'income' || kind === 'expense' ? kind : undefined,
      status: kind === 'draft' ? ('draft' as const) : undefined,
      category: category || undefined,
      month: month || undefined,
    }),
    [category, fieldId, kind, month, year]
  );

  const filterLedger = useCallback(
    (items: FinancialTransaction[]) =>
      items.filter((row) => {
        if (row.status === 'void') return false;
        if (fieldId === UNASSIGNED_FIELD_QUERY) return !row.fieldId;
        return true;
      }),
    [fieldId]
  );

  const reload = useCallback(async () => {
    const list = (await getFieldService().getFields(user?.id || '', user?.role || '', 'money')).filter(
      (field) => field.status !== 'Draft'
    );
    setFields(list);
    const summaryFieldId = fieldId === UNASSIGNED_FIELD_QUERY ? undefined : fieldId || undefined;
    const [yearSummary, ledger, cellarLots] = await Promise.all([
      getFinancialSummaryService()
        .getYear(year, summaryFieldId, locale)
        .then((result) => ({ ok: true as const, result }))
        .catch((error) => {
          if (isForbiddenError(error)) return { ok: false as const, result: null };
          throw error;
        }),
      getFinancialTransactionService().list({
        ...listParams(),
        page: 1,
        pageSize: PAGE_SIZE,
      }),
      oilStockService
        .listLots(summaryFieldId ? { fieldId: summaryFieldId } : undefined)
        .catch(() => [] as OilLot[]),
    ]);
    setSummaryForbidden(!yearSummary.ok);
    setSummary(
      yearSummary.result && fieldId === UNASSIGNED_FIELD_QUERY
        ? overlayUnassignedSummary(yearSummary.result, locale)
        : yearSummary.result
    );
    setOilLots(cellarLots);
    const items = filterLedger(ledger.items);
    setTransactions(items);
    setTotalCount(ledger.totalCount);
    setPage(1);
  }, [fieldId, filterLedger, listParams, locale, user?.id, user?.role, year]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        await reload();
      } finally {
        setLoading(false);
      }
    })();
  }, [reload, reloadToken]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(CAPTURE_SAVED_EVENT, () => setReloadToken((n) => n + 1));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (routeFieldId) setFieldId(routeFieldId);
  }, [routeFieldId]);

  useEffect(() => {
    if (typeof routeYear === 'number' && Number.isFinite(routeYear)) {
      setYear(routeYear);
    }
  }, [routeYear]);

  useEffect(() => {
    if (!routeTx || loading) return;
    const fromList = transactions.find((row) => row.id === routeTx);
    if (fromList) {
      setSelected(fromList);
      return;
    }
    let cancelled = false;
    void getFinancialTransactionService()
      .getById(routeTx)
      .then((tx) => {
        if (!cancelled) setSelected(tx);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [routeTx, loading, transactions]);

  useEffect(() => {
    if (!selected?.relatedTaskId && !selected?.relatedHarvestId) {
      setRelatedTitles({});
      return;
    }
    let cancelled = false;
    void (async () => {
      let taskTitle: string | undefined;
      let harvestTitle: string | undefined;
      if (selected.relatedTaskId) {
        try {
          const task = await getFieldWorkService().getFieldTask(selected.relatedTaskId);
          taskTitle = task.title;
        } catch {
          taskTitle = undefined;
        }
      }
      if (selected.relatedHarvestId && selected.fieldId) {
        try {
          const harvests = await getHarvestService().listByField(selected.fieldId);
          const hit = harvests.find((h) => h.id === selected.relatedHarvestId);
          harvestTitle = hit
            ? formatRelatedHarvestLabel(hit, {
                fieldName: fieldLabelMap(fields)[selected.fieldId] || undefined,
                locale,
                statusLabel: (status) =>
                  status === 'voided' ? t('money:harvestStatusVoided') : t('money:harvestStatusPosted'),
              })
            : undefined;
        } catch {
          harvestTitle = undefined;
        }
      }
      if (!cancelled) setRelatedTitles({ task: taskTitle, harvest: harvestTitle });
    })();
    return () => {
      cancelled = true;
    };
  }, [fields, locale, selected, t]);

  const fieldNames = useMemo(() => fieldLabelMap(fields), [fields]);
  const availableOilLitres = useMemo(() => {
    const scoped =
      fieldId && fieldId !== UNASSIGNED_FIELD_QUERY
        ? oilLots.filter((lot) => lot.fieldIds.includes(fieldId))
        : oilLots;
    return scoped.reduce((sum, lot) => sum + (lot.available?.litres || 0), 0);
  }, [fieldId, oilLots]);
  const emptyYear =
    !summaryForbidden &&
    summary &&
    !summary.dataAvailability.hasPostedRecords &&
    summary.draftCount === 0 &&
    transactions.length === 0;

  const openCapture = useCallback(
    (preferredType: 'money' | 'income' | 'expense' = 'money') => {
      capture?.openCapture({
        preferredType,
        fieldId: fieldId && fieldId !== UNASSIGNED_FIELD_QUERY ? fieldId : undefined,
        sourcePage: 'money',
      });
    },
    [capture, fieldId]
  );

  const exportLedger = useCallback(async () => {
    try {
      setExporting(true);
      const collected: FinancialTransaction[] = [];
      let nextPage = 1;
      let fetched = 0;
      let total = Number.POSITIVE_INFINITY;
      while (fetched < total && nextPage <= 25) {
        const ledger = await getFinancialTransactionService().list({
          ...listParams(),
          page: nextPage,
          pageSize: 200,
        });
        total = ledger.totalCount;
        fetched += ledger.items.length;
        collected.push(...filterLedger(ledger.items));
        if (ledger.items.length === 0) break;
        nextPage += 1;
      }
      const csv = moneyLedgerCsv({
        rows: collected,
        fieldNames,
        unassignedLabel: unassignedFieldLabel(locale),
      });
      await Share.share({
        title: `money-${span}.csv`,
        message: csv,
      });
    } catch {
      /* share cancel is fine */
    } finally {
      setExporting(false);
    }
  }, [fieldNames, filterLedger, listParams, locale, span]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 8, marginRight: 4 }}>
          <HeaderIconButton
            icon={exporting ? 'hourglass-outline' : 'download-outline'}
            accessibilityLabel={exporting ? t('money:exporting') : t('money:export')}
            onPress={() => void exportLedger()}
          />
        </View>
      ),
    });
  }, [navigation, exportLedger, exporting, t]);

  const loadOlder = async () => {
    if (loadingMore || transactions.length >= totalCount) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const ledger = await getFinancialTransactionService().list({
        ...listParams(),
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setTransactions((current) => [...current, ...filterLedger(ledger.items)]);
      setTotalCount(ledger.totalCount);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  };

  const fieldScopeLabel =
    fieldId === UNASSIGNED_FIELD_QUERY
      ? unassignedFieldLabel(locale)
      : fieldId
        ? fieldNames[fieldId] || friendlyFieldLabel(fieldId)
        : t('money:allFields');

  const trustFieldCount = fieldId
    ? 1
    : summary?.fieldResults.filter((row) => row.transactionCount > 0).length ||
      (summary?.dataAvailability.includesUnassigned ? 0 : fields.length);

  const groupedTransactions = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: FinancialTransaction[] }> = [];
    const map = new Map<string, FinancialTransaction[]>();
    for (const tx of transactions) {
      const d = new Date(tx.occurredOn);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    }
    for (const [key, items] of map) {
      const [y, m] = key.split('-').map(Number);
      groups.push({
        key,
        label: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
          new Date(y, m - 1, 1)
        ),
        items,
      });
    }
    return groups;
  }, [locale, transactions]);

  const canManage =
    user?.role === 'FieldOwner' ||
    user?.role === 'Administrator' ||
    Boolean(
      selected && (selected.createdByUserId === user?.id || selected.ownerUserId === user?.id)
    );

  const hasUnitEconomics = Boolean(
    summary &&
      (summary.costPerHectare != null ||
        summary.incomePerHectare != null ||
        summary.netPerHectare != null ||
        summary.costPerKilogramOfOil != null ||
        summary.costPerKilogramMessage)
  );

  const categoryLabel = category
    ? summary?.expenseByCategory.find((row) => row.category === category)?.categoryLabel ||
      summary?.incomeByCategory.find((row) => row.category === category)?.categoryLabel ||
      financialCategoryLabel(category, locale)
    : '';

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScreenLayout scroll padded>
      {fields.length === 0 ? (
        <EmptyState title={t('money:emptyFieldsTitle')} description={t('money:emptyFieldsHint')} />
      ) : (
        <View style={styles.stack}>
          <MoneyTabs
            active={tab}
            onChange={setTab}
            entryCount={summary?.transactionCount || totalCount}
          />
          <MoneyCycleBar
            year={year}
            yearSpan={span}
            yearRangeLabel={harvestYearRangeLabel(year, locale)}
            yearStatus={yearStatus}
            seasonLine={seasonLine}
            tapMin={tapMin}
            onYearChange={(next) => {
              setYear(next);
              setMonth(0);
            }}
          />

          <View style={styles.scopeRow}>
            <Pressable
              onPress={() => setFieldPickerOpen(true)}
              accessibilityLabel={t('money:fieldAria')}
              style={[
                styles.scopeChip,
                {
                  minHeight: Math.max(44, tapMin * 0.9),
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                  ...createElevation(colors, 'flat'),
                },
              ]}
            >
              <FieldColorMark
                color={fields.find((field) => field.id === fieldId)?.color}
                fieldId={fieldId || undefined}
                hollow={!fieldId || fieldId === UNASSIGNED_FIELD_QUERY}
                size={12}
              />
              <Text
                style={{ color: colors.textPrimary, fontWeight: '600', flexShrink: 1 }}
                numberOfLines={1}
              >
                {fieldScopeLabel}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
            </Pressable>

            {month > 0 ? (
              <DismissibleChip
                label={t('money:showingMonth', { month: harvestMonthTitle(year, month, locale) })}
                onDismiss={() => setMonth(0)}
              />
            ) : null}
            {category ? (
              <DismissibleChip label={categoryLabel} onDismiss={() => setCategory('')} />
            ) : null}
            {month > 0 || category ? (
              <Pressable onPress={() => { setMonth(0); setCategory(''); }} hitSlop={8}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('money:clearFilters')}</Text>
              </Pressable>
            ) : null}
          </View>

          {tab === 'overview' ? (
            summaryForbidden ? (
              <EmptyState
                title={t('money:collaboratorTitle')}
                description={t('money:collaboratorHint')}
                action={capture ? { label: t('money:addEntry'), onPress: () => openCapture('expense') } : undefined}
              />
            ) : summary ? (
              <>
                <MoneyStatGrid
                  summary={summary}
                  oilLitres={availableOilLitres}
                  locale={locale}
                  onAdd={capture ? () => openCapture('money') : undefined}
                  onOpenOil={() => navigation.navigate('MyOil')}
                />

                <MoneyFieldRows
                  rows={summary.fieldResults}
                  currency={summary.currency}
                  locale={locale}
                  fieldNames={fieldNames}
                  fields={fields}
                  missingAreaFieldIds={summary.dataAvailability.missingAreaFieldIds ?? []}
                  onSelectField={setFieldId}
                />

                <MoneyTrustStrip
                  summary={summary}
                  fieldCount={trustFieldCount}
                  onOpenDrafts={() => {
                    setKind('draft');
                    setTab('entries');
                  }}
                />

                {summary.dataAvailability.hasPostedRecords ? (
                  <MoneyMonthStrip
                    year={year}
                    months={summary.monthlyResults}
                    currency={summary.currency}
                    locale={locale}
                    selectedMonth={month}
                    onSelectMonth={setMonth}
                  />
                ) : null}

                {summary.expenseByCategory.length > 0 ? (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.borderLight,
                        ...createElevation(colors, 'flat'),
                      },
                    ]}
                  >
                    <MoneyCategoryBreakdown
                      expenses={summary.expenseByCategory}
                      income={[]}
                      currency={summary.currency}
                      locale={locale}
                      expensesOnly
                      onSelectCategory={(value) => {
                        setCategory(value);
                        setKind('all');
                        setTab('entries');
                      }}
                    />
                  </View>
                ) : null}

                {hasUnitEconomics ||
                summary.oliveOil?.hasProductionOrSales ||
                summary.incomeByCategory.length > 0 ? (
                  <MoneyExpandableSection title={t('money:moreDetails')}>
                    {hasUnitEconomics ? (
                      <View style={{ gap: 6 }}>
                        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
                          {t('money:unitEconomicsTitle')}
                        </Text>
                        {summary.costPerHectare != null ? (
                          <Text style={{ color: colors.textPrimary }}>
                            {t('money:costPerHectare')}:{' '}
                            {formatOfficialAmount(
                              perAreaForDisplay(summary.costPerHectare, locale),
                              summary.currency,
                              locale,
                              unknown
                            )}
                          </Text>
                        ) : null}
                        {summary.incomePerHectare != null ? (
                          <Text style={{ color: colors.textPrimary }}>
                            {t('money:incomePerHectare')}:{' '}
                            {formatOfficialAmount(
                              perAreaForDisplay(summary.incomePerHectare, locale),
                              summary.currency,
                              locale,
                              unknown
                            )}
                          </Text>
                        ) : null}
                        {summary.netPerHectare != null ? (
                          <Text style={{ color: colors.textPrimary }}>
                            {t('money:netPerHectare')}:{' '}
                            {formatOfficialAmount(
                              perAreaForDisplay(summary.netPerHectare, locale),
                              summary.currency,
                              locale,
                              unknown
                            )}
                          </Text>
                        ) : null}
                        {summary.costPerKilogramOfOil != null ? (
                          <Text style={{ color: colors.textPrimary }}>
                            {t('money:costPerKg')}:{' '}
                            {formatOfficialAmount(
                              summary.costPerKilogramOfOil,
                              summary.currency,
                              locale,
                              unknown
                            )}
                          </Text>
                        ) : summary.costPerKilogramMessage ? (
                          <Text style={{ color: colors.textTertiary }}>{summary.costPerKilogramMessage}</Text>
                        ) : null}
                      </View>
                    ) : null}
                    {summary.oliveOil?.hasProductionOrSales ? (
                      <OliveOilEconomicsCard year={year} oil={summary.oliveOil} locale={locale} embedded />
                    ) : null}
                    {summary.incomeByCategory.length > 0 ? (
                      <MoneyCategoryBreakdown
                        expenses={[]}
                        income={summary.incomeByCategory}
                        currency={summary.currency}
                        locale={locale}
                        onSelectCategory={(value) => {
                          setCategory(value);
                          setKind('all');
                          setTab('entries');
                        }}
                      />
                    ) : null}
                  </MoneyExpandableSection>
                ) : null}
              </>
            ) : null
          ) : (
            <View style={styles.stack}>
              <MoneyContextBar
                year={year}
                yearSpan={span}
                yearStatus={yearStatus}
                kind={kind}
                hideIncome={summaryForbidden}
                hideYear
                tapMin={tapMin}
                onYearChange={(next) => {
                  setYear(next);
                  setMonth(0);
                }}
                onKindChange={setKind}
              />
              {transactions.length === 0 ? (
                <Text style={{ color: colors.textSecondary }}>
                  {emptyYear ? t('money:emptyHint') : t('money:noMatchingEntries')}
                </Text>
              ) : (
                groupedTransactions.map((group) => (
                  <View key={group.key} style={styles.monthGroup}>
                    <Text style={[styles.monthHeading, { color: colors.textTertiary }]}>{group.label}</Text>
                    {group.items.map((tx) => (
                      <MoneyTransactionRow
                        key={tx.id}
                        item={tx}
                        locale={locale}
                        fieldNames={fieldNames}
                        unknown={unknown}
                        onOpen={setSelected}
                      />
                    ))}
                  </View>
                ))
              )}
              {transactions.length < totalCount ? (
                <Button
                  title={t('money:loadOlder')}
                  variant="outline"
                  loading={loadingMore}
                  onPress={() => void loadOlder()}
                />
              ) : null}
            </View>
          )}
        </View>
      )}

      <Sheet
        open={fieldPickerOpen}
        onClose={() => setFieldPickerOpen(false)}
        edge="end"
        title={t('money:allFields')}
        size="sm"
      >
        <Pressable
          onPress={() => {
            setFieldId('');
            setFieldPickerOpen(false);
          }}
          style={[styles.pickerRow, { minHeight: tapMin, borderBottomColor: colors.borderLight }]}
        >
          <FieldColorMark hollow size={12} />
          <Text style={{ fontWeight: '700', color: colors.textPrimary, flex: 1 }}>{t('money:allFields')}</Text>
        </Pressable>
        {fields.map((field) => (
          <Pressable
            key={field.id}
            onPress={() => {
              setFieldId(field.id);
              setFieldPickerOpen(false);
            }}
            style={[styles.pickerRow, { minHeight: tapMin, borderBottomColor: colors.borderLight }]}
          >
            <FieldColorMark color={field.color} fieldId={field.id} size={12} />
            <Text style={{ color: colors.textPrimary, flex: 1 }}>{friendlyFieldLabel(field.name)}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => {
            setFieldId(UNASSIGNED_FIELD_QUERY);
            setFieldPickerOpen(false);
          }}
          style={[styles.pickerRow, { minHeight: tapMin, borderBottomColor: colors.borderLight }]}
        >
          <FieldColorMark hollow size={12} />
          <Text style={{ color: colors.textPrimary, flex: 1 }}>{unassignedFieldLabel(locale)}</Text>
        </Pressable>
      </Sheet>

      <MoneyTransactionDrawer
        transaction={selected}
        fieldName={selected?.fieldId ? fieldNames[selected.fieldId] : undefined}
        relatedTaskTitle={relatedTitles.task}
        relatedHarvestTitle={relatedTitles.harvest}
        canManage={canManage}
        fields={fields}
        onClose={() => setSelected(null)}
        onUpdate={async (id, input) => {
          const updated = await getFinancialTransactionService().update(id, input);
          setSelected(updated);
          setReloadToken((n) => n + 1);
        }}
        onVoid={async (id, reason) => {
          await getFinancialTransactionService().void(id, reason);
          setSelected(null);
          setReloadToken((n) => n + 1);
        }}
        onPostDraft={async (id) => {
          await getFinancialTransactionService().post(id);
          setSelected(null);
          setReloadToken((n) => n + 1);
        }}
        onDeleteDraft={async (id) => {
          await getFinancialTransactionService().deleteDraft(id);
          setSelected(null);
          setReloadToken((n) => n + 1);
        }}
        onOpenTask={(taskId) => {
          setSelected(null);
          navigation.navigate('TaskDetail', { taskId });
        }}
        onOpenHarvest={(payload) => {
          setSelected(null);
          navigation.navigate('HarvestCampaign', payload);
        }}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '100%',
  },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.base,
  },
  sectionLabel: {
    ...typography.styles.overline,
  },
  monthGroup: { gap: spacing.sm },
  monthHeading: {
    ...typography.styles.overline,
    marginTop: spacing.sm,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
});

export default MoneyScreen;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Sheet from '../components/ui/Sheet';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { useCaptureOptional } from '../context/CaptureContext';
import {
  getFieldService,
  getFinancialSummaryService,
  getFinancialTransactionService,
} from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import type { FinancialTransaction } from '../services/financialTransactionService';
import type { YearFinancialSummary } from '../services/financialSummaryService';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import { fieldLabelMap, friendlyFieldLabel } from '../utils/fieldLabels';
import { UNASSIGNED_FIELD_QUERY } from '../finance/buildYearSummary';
import { formatOfficialAmount, formatOfficialNet, isForbiddenError } from '../finance/format';
import {
  financialCategoryLabel,
  financialStatusLabel,
  financialTypeLabel,
  isRawFinancialValue,
  resultLabel,
  unassignedFieldLabel,
} from '../finance/display';
import { spacing, typography, radii } from '../theme';

type KindFilter = 'all' | 'income' | 'expense' | 'draft';

const overlayUnassigned = (summary: YearFinancialSummary, language: string): YearFinancialSummary => {
  const row = summary.fieldResults.find((item) => item.isUnassigned);
  const hasPosted = Boolean(row && row.transactionCount > 0);
  return {
    ...summary,
    fieldId: null,
    totalIncome: row?.income ?? null,
    totalExpenses: row?.expenses ?? null,
    netResult: row?.netResult ?? null,
    resultLabel: resultLabel(row?.netResult, hasPosted, language),
    transactionCount: row?.transactionCount ?? 0,
    monthlyResults: summary.monthlyResults.map((month) => ({
      ...month,
      income: null,
      expenses: null,
      netResult: null,
      hasRecords: false,
    })),
    fieldResults: [],
    incomeByCategory: [],
    expenseByCategory: [],
    dataAvailability: {
      ...summary.dataAvailability,
      hasPostedRecords: hasPosted,
      includesUnassigned: true,
    },
  };
};

const labelOr = (raw: string | undefined, fallback: string) =>
  raw && !isRawFinancialValue(raw) ? raw : fallback;

const MoneyScreen = () => {
  const { t, i18n } = useTranslation(['money', 'capture', 'common']);
  const { colors } = useTheme();
  const { tapMin, isFullPicture } = usePreferences();
  const { user, isFieldOwner } = useAuth();
  const capture = useCaptureOptional();
  const route = useRoute();
  const routeFieldId = (route.params as { fieldId?: string } | undefined)?.fieldId || '';

  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<Field[]>([]);
  const [summary, setSummary] = useState<YearFinancialSummary | null>(null);
  const [summaryForbidden, setSummaryForbidden] = useState(false);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [fieldId, setFieldId] = useState(routeFieldId);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(0);
  const [kind, setKind] = useState<KindFilter>('all');
  const [selected, setSelected] = useState<FinancialTransaction | null>(null);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const unknown = t('money:unknownAmount');
  const locale = i18n.language;

  const reload = useCallback(async () => {
    const list = (await getFieldService().getFields(user?.id || '', user?.role || '')).filter(
      (field) => field.status !== 'Draft'
    );
    setFields(list);
    const summaryFieldId = fieldId === UNASSIGNED_FIELD_QUERY ? undefined : fieldId || undefined;
    const [yearSummary, ledger] = await Promise.all([
      getFinancialSummaryService()
        .getYear(year, summaryFieldId, locale)
        .then((result) => ({ ok: true as const, result }))
        .catch((error) => {
          if (isForbiddenError(error)) return { ok: false as const, result: null };
          throw error;
        }),
      getFinancialTransactionService().list({
        resultYear: year,
        fieldId: fieldId && fieldId !== UNASSIGNED_FIELD_QUERY ? fieldId : undefined,
        type: kind === 'income' || kind === 'expense' ? kind : undefined,
        status: kind === 'draft' ? 'draft' : undefined,
        month: month || undefined,
        pageSize: 100,
      }),
    ]);
    setSummaryForbidden(!yearSummary.ok);
    setSummary(
      yearSummary.result && fieldId === UNASSIGNED_FIELD_QUERY
        ? overlayUnassigned(yearSummary.result, locale)
        : yearSummary.result
    );
    setTransactions(
      ledger.items.filter((row) => {
        if (row.status === 'void') return false;
        if (fieldId === UNASSIGNED_FIELD_QUERY) return !row.fieldId;
        return true;
      })
    );
  }, [fieldId, kind, locale, month, user?.id, user?.role, year]);

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

  const fieldNames = useMemo(() => fieldLabelMap(fields), [fields]);
  const emptyYear =
    !summaryForbidden &&
    summary &&
    !summary.dataAvailability.hasPostedRecords &&
    summary.draftCount === 0 &&
    transactions.length === 0;

  const openCapture = () => {
    capture?.openCapture({
      preferredType: 'money',
      fieldId: fieldId && fieldId !== UNASSIGNED_FIELD_QUERY ? fieldId : undefined,
    });
  };

  const money = (amount: number | null | undefined) =>
    formatOfficialAmount(amount, summary?.currency || 'EUR', locale, unknown);
  const net = (amount: number | null | undefined) =>
    formatOfficialNet(amount, summary?.currency || 'EUR', locale, unknown);

  const handleVoid = async (id: string, reason: string) => {
    try {
      await getFinancialTransactionService().void(id, reason);
      setSelected(null);
      setReloadToken((n) => n + 1);
    } catch {
      Alert.alert(t('money:actionFailed'));
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScreenLayout scroll padded>
      <ScreenHeader
        title={t('money:title')}
        subtitle={t('money:subtitle')}
        actionLabel={t('capture:money.ctaPlus')}
        onActionPress={openCapture}
      />

      {fields.length === 0 ? (
        <EmptyState title={t('money:emptyFieldsTitle')} description={t('money:emptyFieldsHint')} />
      ) : (
        <>
          <View style={styles.toolbar}>
            <Pressable
              onPress={() => setYear((value) => value - 1)}
              style={[styles.yearBtn, { borderColor: colors.border, minHeight: tapMin }]}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 18 }}>‹</Text>
            </Pressable>
            <Text style={[styles.year, { color: colors.textPrimary }]}>{year}</Text>
            <Pressable
              onPress={() => setYear((value) => value + 1)}
              style={[styles.yearBtn, { borderColor: colors.border, minHeight: tapMin }]}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 18 }}>›</Text>
            </Pressable>
            <Pressable
              onPress={() => setFieldPickerOpen(true)}
              style={[
                styles.select,
                { borderColor: colors.border, backgroundColor: colors.surfaceElevated, minHeight: tapMin },
              ]}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {fieldId === UNASSIGNED_FIELD_QUERY
                  ? unassignedFieldLabel(locale)
                  : fieldId
                    ? fieldNames[fieldId]
                    : t('money:allFields')}
              </Text>
            </Pressable>
          </View>

          {summaryForbidden ? (
            <EmptyState title={t('money:collaboratorTitle')} description={t('money:collaboratorHint')} />
          ) : emptyYear ? (
            <EmptyState
              title={t('money:emptyTitle', { year })}
              description={t('money:emptyHint')}
              action={capture ? { label: t('capture:money.cta'), onPress: openCapture } : undefined}
            />
          ) : summary ? (
            <View style={styles.stack}>
              <View style={styles.split}>
                <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={{ color: colors.textSecondary }}>{t('money:income')}</Text>
                  <Text style={{ color: colors.successDark, fontWeight: '700', fontSize: 18 }}>
                    {money(summary.totalIncome)}
                  </Text>
                </View>
                <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={{ color: colors.textSecondary }}>{t('money:expenses')}</Text>
                  <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 18 }}>
                    {money(summary.totalExpenses)}
                  </Text>
                </View>
              </View>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('money:result')}</Text>
                <Text style={[styles.hero, { color: colors.textPrimary }]}>{net(summary.netResult)}</Text>
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{summary.resultLabel}</Text>
              </View>

              {summary.dataAvailability.hasPostedRecords &&
              summary.monthlyResults.some((item) => item.hasRecords) ? (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('money:monthly')}</Text>
                  {summary.monthlyResults.map((item) => {
                    const name = new Intl.DateTimeFormat(locale, { month: 'short' }).format(
                      new Date(year, item.month - 1, 1)
                    );
                    return (
                      <Pressable
                        key={item.month}
                        onPress={() => setMonth((current) => (current === item.month ? 0 : item.month))}
                        style={[styles.monthRow, { minHeight: tapMin }]}
                        accessibilityLabel={
                          item.hasRecords
                            ? `${name}: ${t('money:incomeShort')} ${money(item.income)}, ${t('money:expenseShort')} ${money(item.expenses)}`
                            : `${name}: ${item.emptyLabel}`
                        }
                      >
                        <Text style={{ width: 48, color: colors.textSecondary, fontWeight: month === item.month ? '700' : '500' }}>
                          {name}
                        </Text>
                        <Text style={{ flex: 1, color: colors.textPrimary }}>
                          {item.hasRecords ? money(item.income) : item.emptyLabel}
                        </Text>
                        <Text style={{ flex: 1, color: colors.textPrimary }}>
                          {item.hasRecords ? money(item.expenses) : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {!fieldId && summary.fieldResults.length > 0 ? (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('money:byField')}</Text>
                  {summary.fieldResults.map((row) => (
                    <Pressable
                      key={row.fieldId || 'unassigned'}
                      onPress={() =>
                        setFieldId(row.isUnassigned ? UNASSIGNED_FIELD_QUERY : row.fieldId || '')
                      }
                      style={[styles.fieldRow, { borderBottomColor: colors.border, minHeight: tapMin }]}
                    >
                      <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                        {row.isUnassigned
                          ? row.fieldName
                          : fieldNames[row.fieldId || ''] || friendlyFieldLabel(row.fieldName)}
                      </Text>
                      <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                        {t('money:income')} {money(row.income)} · {t('money:expenses')} {money(row.expenses)}
                      </Text>
                      {isFullPicture && row.costPerHectare != null ? (
                        <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                          {money(row.costPerHectare)} {t('money:perHectare')}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {summary.expenseByCategory.slice(0, 5).map((row) => (
                <View key={row.category} style={{ marginBottom: spacing.sm }}>
                  <View style={styles.barMeta}>
                    <Text style={{ color: colors.textPrimary }}>{row.categoryLabel}</Text>
                    <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{money(row.amount)}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {!emptyYear || summaryForbidden ? (
            <View style={styles.stack}>
              <View style={styles.kindRow}>
                {(
                  [
                    ['all', 'kindAll'],
                    ...((summaryForbidden ? [] : [['income', 'kindIncome']]) as Array<[KindFilter, string]>),
                    ['expense', 'kindExpenses'],
                    ['draft', 'kindDrafts'],
                  ] as Array<[KindFilter, string]>
                ).map(([value, key]) => (
                  <Pressable
                    key={value}
                    onPress={() => setKind(value)}
                    style={[
                      styles.kindChip,
                      {
                        minHeight: tapMin,
                        borderColor: kind === value ? colors.oliveBorder : colors.border,
                        backgroundColor: kind === value ? colors.primaryLight : colors.surface,
                      },
                    ]}
                  >
                    <Text style={{ fontWeight: '600', color: kind === value ? colors.primary : colors.textSecondary }}>
                      {t(`money:${key}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {transactions.map((tx) => (
                <Pressable
                  key={tx.id}
                  onPress={() => setSelected(tx)}
                  style={[styles.row, { borderBottomColor: colors.border, minHeight: tapMin }]}
                >
                  <View style={styles.rowBody}>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{tx.description}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {labelOr(tx.typeLabel, financialTypeLabel(tx.type, locale))}
                      {tx.category
                        ? ` · ${labelOr(tx.categoryLabel, financialCategoryLabel(tx.category, locale))}`
                        : ''}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: tx.type === 'income' ? colors.successDark : colors.textPrimary,
                      fontWeight: '700',
                    }}
                  >
                    {formatOfficialAmount(tx.amount, tx.currency, locale, unknown)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
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
          style={[styles.pickerRow, { minHeight: tapMin, borderBottomColor: colors.border }]}
        >
          <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{t('money:allFields')}</Text>
        </Pressable>
        {fields.map((field) => (
          <Pressable
            key={field.id}
            onPress={() => {
              setFieldId(field.id);
              setFieldPickerOpen(false);
            }}
            style={[styles.pickerRow, { minHeight: tapMin, borderBottomColor: colors.border }]}
          >
            <Text style={{ color: colors.textPrimary }}>{friendlyFieldLabel(field.name)}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => {
            setFieldId(UNASSIGNED_FIELD_QUERY);
            setFieldPickerOpen(false);
          }}
          style={[styles.pickerRow, { minHeight: tapMin, borderBottomColor: colors.border }]}
        >
          <Text style={{ color: colors.textPrimary }}>{unassignedFieldLabel(locale)}</Text>
        </Pressable>
      </Sheet>

      <Sheet
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        edge="end"
        title={selected?.description}
        subtitle={
          selected
            ? labelOr(selected.typeLabel, financialTypeLabel(selected.type, locale))
            : undefined
        }
        footer={
          selected ? (
            <View style={{ gap: spacing.sm }}>
              {selected.status === 'draft' ? (
                <>
                  <Button
                    title={t('money:postDraft')}
                    onPress={() =>
                      void getFinancialTransactionService()
                        .post(selected.id)
                        .then(() => {
                          setSelected(null);
                          setReloadToken((n) => n + 1);
                        })
                    }
                  />
                  <Button
                    title={t('money:deleteDraft')}
                    variant="outline"
                    onPress={() =>
                      void getFinancialTransactionService()
                        .deleteDraft(selected.id)
                        .then(() => {
                          setSelected(null);
                          setReloadToken((n) => n + 1);
                        })
                    }
                  />
                </>
              ) : null}
              {selected.status === 'posted' && isFieldOwner() ? (
                <Button
                  title={t('money:voidPosted')}
                  variant="outline"
                  onPress={() =>
                    Alert.prompt
                      ? Alert.prompt(t('money:voidPosted'), t('money:voidReasonPrompt'), (reason) => {
                          if (reason?.trim()) void handleVoid(selected.id, reason.trim());
                        })
                      : void handleVoid(selected.id, t('capture:money.undoReason'))
                  }
                />
              ) : null}
              <Button
                title={t('common:cancel', { defaultValue: 'Cancel' })}
                variant="outline"
                onPress={() => setSelected(null)}
              />
            </View>
          ) : null
        }
      >
        {selected ? (
          <>
            <Text style={{ fontSize: 28, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm }}>
              {formatOfficialAmount(selected.amount, selected.currency, locale, unknown)}
            </Text>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>
              {labelOr(selected.statusLabel, financialStatusLabel(selected.status, locale))}
            </Text>
          </>
        ) : null}
      </Sheet>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, alignItems: 'center' },
  yearBtn: {
    width: 48,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  year: { fontSize: 28, fontWeight: '700', minWidth: 72, textAlign: 'center' },
  select: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  stack: { gap: spacing.md },
  split: { flexDirection: 'row', gap: spacing.md },
  resultCard: { flex: 1, borderWidth: 1, borderRadius: radii.md, padding: spacing.md },
  card: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md },
  sectionLabel: {
    ...typography.styles.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  hero: { fontSize: 32, fontWeight: '700', marginBottom: spacing.sm },
  barMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
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
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  kindChip: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  monthRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  pickerRow: {
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
});

export default MoneyScreen;

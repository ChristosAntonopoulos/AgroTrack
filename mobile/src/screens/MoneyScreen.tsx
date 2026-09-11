import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
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
import MoneyContextBar, { type MoneyKindFilter } from '../components/money/MoneyContextBar';
import MoneySummaryCards from '../components/money/MoneySummaryCards';
import MoneyTransactionRow from '../components/money/MoneyTransactionRow';
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
import { spacing, typography, radii, createElevation } from '../theme';

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
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const { isFullPicture } = usePreferences();
  const { user, isFieldOwner } = useAuth();
  const capture = useCaptureOptional();
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = route.params as { fieldId?: string; year?: number } | undefined;
  const routeFieldId = routeParams?.fieldId || '';
  const routeYear = routeParams?.year;

  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<Field[]>([]);
  const [summary, setSummary] = useState<YearFinancialSummary | null>(null);
  const [summaryForbidden, setSummaryForbidden] = useState(false);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [fieldId, setFieldId] = useState(routeFieldId);
  const [year, setYear] = useState(
    typeof routeYear === 'number' && Number.isFinite(routeYear)
      ? routeYear
      : new Date().getFullYear()
  );
  const [month, setMonth] = useState(0);
  const [kind, setKind] = useState<MoneyKindFilter>('all');
  const [selected, setSelected] = useState<FinancialTransaction | null>(null);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
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

  useEffect(() => {
    if (typeof routeYear === 'number' && Number.isFinite(routeYear)) {
      setYear(routeYear);
    }
  }, [routeYear]);

  const fieldNames = useMemo(() => fieldLabelMap(fields), [fields]);
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
      });
    },
    [capture, fieldId]
  );

  useLayoutEffect(() => {
    if (!capture) return;
    navigation.setOptions({
      headerRight: () => (
        <HeaderIconButton
          icon="add"
          accessibilityLabel={t('capture:money.ctaPlus')}
          onPress={() => openCapture('money')}
        />
      ),
    });
  }, [navigation, capture, openCapture, t]);

  const money = (amount: number | null | undefined) =>
    formatOfficialAmount(amount, summary?.currency || 'EUR', locale, unknown);

  const handleVoid = async (id: string, reason: string) => {
    try {
      await getFinancialTransactionService().void(id, reason);
      setSelected(null);
      setReloadToken((n) => n + 1);
    } catch {
      Alert.alert(t('money:actionFailed'));
    }
  };

  const fieldScopeLabel =
    fieldId === UNASSIGNED_FIELD_QUERY
      ? unassignedFieldLabel(locale)
      : fieldId
        ? fieldNames[fieldId] || friendlyFieldLabel(fieldId)
        : t('money:allFields');

  const trustComputed = useMemo(() => {
    if (!summary?.dataAvailability.hasPostedRecords) return null;
    const fieldCount = fieldId
      ? 1
      : summary.fieldResults.filter((row) => row.transactionCount > 0).length ||
        (summary.dataAvailability.includesUnassigned ? 0 : fields.length);
    if (fieldCount > 1) return t('money:computedFrom', { count: summary.transactionCount, fields: fieldCount });
    if (fieldCount === 1) return t('money:computedFromOneField', { count: summary.transactionCount });
    return t('money:computedFromUnassigned', { count: summary.transactionCount });
  }, [fieldId, fields.length, summary, t]);

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

  const expenseCategories = summary?.expenseByCategory || [];
  const visibleCategories = showAllCategories ? expenseCategories : expenseCategories.slice(0, 5);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScreenLayout scroll padded>
      {fields.length === 0 ? (
        <EmptyState title={t('money:emptyFieldsTitle')} description={t('money:emptyFieldsHint')} />
      ) : (
        <View style={styles.stack}>
          <MoneyContextBar
            year={year}
            kind={kind}
            hideIncome={summaryForbidden}
            tapMin={tapMin}
            onYearChange={(next) => {
              setYear(next);
              setMonth(0);
            }}
            onKindChange={setKind}
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
              <Ionicons name="map-outline" size={16} color={colors.primary} />
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
                label={new Intl.DateTimeFormat(locale, { month: 'short' }).format(
                  new Date(year, month - 1, 1)
                )}
                onDismiss={() => setMonth(0)}
              />
            ) : null}
          </View>

          {summaryForbidden ? (
            <EmptyState title={t('money:collaboratorTitle')} description={t('money:collaboratorHint')} />
          ) : emptyYear ? (
            <EmptyState
              title={t('money:emptyTitle', { year })}
              description={t('money:emptyHint')}
              action={capture ? { label: t('capture:money.cta'), onPress: () => openCapture('money') } : undefined}
            />
          ) : summary ? (
            <>
              <MoneySummaryCards
                summary={summary}
                locale={locale}
                onAddIncome={capture ? () => openCapture('income') : undefined}
              />

              {(trustComputed || summary.draftCount > 0 || summary.lastPostedAt) && (
                <View style={styles.trustStrip}>
                  {trustComputed ? (
                    <Text style={[styles.trustText, { color: colors.textTertiary }]}>{trustComputed}</Text>
                  ) : null}
                  {summary.lastPostedAt ? (
                    <Text style={[styles.trustText, { color: colors.textTertiary }]}>
                      {t('money:lastUpdate', {
                        date: new Date(summary.lastPostedAt).toLocaleString(locale, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }),
                      })}
                    </Text>
                  ) : null}
                  {summary.draftCount > 0 ? (
                    <Pressable onPress={() => setKind('draft')} hitSlop={8}>
                      <Text style={[styles.trustLink, { color: colors.primary }]}>
                        {t('money:draftCountClickable', { count: summary.draftCount })}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              )}

              {summary.dataAvailability.hasPostedRecords &&
              summary.monthlyResults.some((item) => item.hasRecords) ? (
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
                  <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t('money:monthly')}</Text>
                  {summary.monthlyResults.map((item) => {
                    const name = new Intl.DateTimeFormat(locale, { month: 'short' }).format(
                      new Date(year, item.month - 1, 1)
                    );
                    const active = month === item.month;
                    return (
                      <Pressable
                        key={item.month}
                        onPress={() => setMonth((current) => (current === item.month ? 0 : item.month))}
                        style={[
                          styles.monthRow,
                          {
                            minHeight: tapMin,
                            backgroundColor: active ? colors.primaryLight : 'transparent',
                            borderRadius: radii.md,
                          },
                        ]}
                        accessibilityLabel={
                          item.hasRecords
                            ? `${name}: ${t('money:incomeShort')} ${money(item.income)}, ${t('money:expenseShort')} ${money(item.expenses)}`
                            : `${name}: ${item.emptyLabel}`
                        }
                      >
                        <Text
                          style={{
                            width: 44,
                            color: active ? colors.primary : colors.textSecondary,
                            fontWeight: active ? '700' : '500',
                          }}
                        >
                          {name}
                        </Text>
                        <Text style={{ flex: 1, color: colors.eventIncome, fontVariant: ['tabular-nums'] }}>
                          {item.hasRecords ? money(item.income) : item.emptyLabel}
                        </Text>
                        <Text style={{ flex: 1, color: colors.eventExpense, fontVariant: ['tabular-nums'] }}>
                          {item.hasRecords ? money(item.expenses) : ''}
                        </Text>
                        <Text
                          style={{
                            minWidth: 72,
                            textAlign: 'right',
                            fontWeight: '700',
                            color: colors.textPrimary,
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {item.hasRecords
                            ? formatOfficialNet(item.netResult, summary.currency, locale, unknown)
                            : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {!fieldId && summary.fieldResults.length > 0 ? (
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
                  <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t('money:byField')}</Text>
                  {summary.fieldResults.map((row) => (
                    <Pressable
                      key={row.fieldId || 'unassigned'}
                      onPress={() =>
                        setFieldId(row.isUnassigned ? UNASSIGNED_FIELD_QUERY : row.fieldId || '')
                      }
                      style={[styles.fieldRow, { borderBottomColor: colors.borderLight, minHeight: tapMin }]}
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
                        <Text style={{ color: colors.textTertiary, marginTop: 2 }}>
                          {money(row.costPerHectare)} {t('money:perHectare')}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {expenseCategories.length > 0 ? (
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
                  <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t('money:moneyWent')}</Text>
                  {visibleCategories.map((row) => (
                    <View key={row.category} style={styles.categoryBlock}>
                      <View style={styles.barMeta}>
                        <Text style={{ color: colors.textPrimary, flex: 1 }} numberOfLines={1}>
                          {row.categoryLabel}
                        </Text>
                        <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                          {money(row.amount)}
                          {row.percentageOfTotal != null ? ` · ${Math.round(row.percentageOfTotal)}%` : ''}
                        </Text>
                      </View>
                      <View style={[styles.track, { backgroundColor: colors.borderLight }]}>
                        <View
                          style={[
                            styles.fill,
                            {
                              width: `${Math.max(6, row.percentageOfTotal || 0)}%`,
                              backgroundColor: colors.eventExpense,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                  {expenseCategories.length > 5 ? (
                    <Pressable onPress={() => setShowAllCategories((v) => !v)} hitSlop={8}>
                      <Text style={{ color: colors.primary, fontWeight: '700', marginTop: spacing.sm }}>
                        {showAllCategories ? t('money:showLess') : t('money:showAll')}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </>
          ) : null}

          {!emptyYear || summaryForbidden ? (
            <View style={styles.stack}>
              <Text style={[styles.entriesTitle, { color: colors.textPrimary, fontSize: 18 * fontScaleMultiplier }]}>
                {t('money:entries')}
              </Text>
              {transactions.length === 0 ? (
                <Text style={{ color: colors.textSecondary }}>{t('money:noMatchingEntries')}</Text>
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
            </View>
          ) : null}
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
          <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{t('money:allFields')}</Text>
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
            <Text style={{ color: colors.textPrimary }}>{friendlyFieldLabel(field.name)}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => {
            setFieldId(UNASSIGNED_FIELD_QUERY);
            setFieldPickerOpen(false);
          }}
          style={[styles.pickerRow, { minHeight: tapMin, borderBottomColor: colors.borderLight }]}
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
          <View style={styles.detail}>
            <Text
              style={{
                fontSize: 32 * fontScaleMultiplier,
                fontWeight: '700',
                letterSpacing: -0.8,
                color: selected.type === 'income' ? colors.eventIncome : colors.textPrimary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {selected.type === 'income' ? '+' : '−'}
              {formatOfficialAmount(selected.amount, selected.currency, locale, unknown)}
            </Text>

            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor:
                    selected.status === 'draft'
                      ? colors.primaryLight
                      : selected.status === 'void'
                        ? colors.errorLight
                        : colors.surfaceElevated,
                },
              ]}
            >
              <Text
                style={{
                  fontWeight: '700',
                  fontSize: 12,
                  color:
                    selected.status === 'draft'
                      ? colors.primary
                      : selected.status === 'void'
                        ? colors.errorDark
                        : colors.textSecondary,
                }}
              >
                {labelOr(selected.statusLabel, financialStatusLabel(selected.status, locale))}
              </Text>
            </View>

            <DetailLine
              label={t('money:date')}
              value={new Date(selected.occurredOn).toLocaleDateString(locale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              colors={colors}
            />
            <DetailLine
              label={t('money:category')}
              value={
                selected.category
                  ? labelOr(selected.categoryLabel, financialCategoryLabel(selected.category, locale))
                  : '—'
              }
              colors={colors}
            />
            <DetailLine
              label={t('money:field')}
              value={
                selected.fieldId
                  ? fieldNames[selected.fieldId] || friendlyFieldLabel(selected.fieldId)
                  : unassignedFieldLabel(locale)
              }
              colors={colors}
            />
            {selected.notes ? (
              <DetailLine label={t('money:notes')} value={selected.notes} colors={colors} />
            ) : null}
            {selected.counterpartyName ? (
              <DetailLine label={t('money:counterparty')} value={selected.counterpartyName} colors={colors} />
            ) : null}
          </View>
        ) : null}
      </Sheet>
    </ScreenLayout>
  );
};

const DetailLine: React.FC<{
  label: string;
  value: string;
  colors: { textTertiary: string; textPrimary: string };
}> = ({ label, value, colors }) => (
  <View style={styles.detailLine}>
    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>{label}</Text>
    <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15 }}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '100%',
  },
  trustStrip: { gap: 4 },
  trustText: { ...typography.styles.caption, lineHeight: 18 },
  trustLink: { fontWeight: '700', fontSize: 13 },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.base,
  },
  sectionLabel: {
    ...typography.styles.overline,
    marginBottom: spacing.sm,
  },
  monthRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  fieldRow: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  categoryBlock: { gap: 6, marginBottom: spacing.md },
  barMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  track: { height: 6, borderRadius: radii.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.full },
  entriesTitle: { fontWeight: '700', letterSpacing: -0.3, marginTop: spacing.sm },
  monthGroup: { gap: spacing.sm },
  monthHeading: {
    ...typography.styles.overline,
    marginTop: spacing.sm,
  },
  pickerRow: {
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  detail: { gap: spacing.md },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detailLine: { gap: 4 },
  detailLabel: { ...typography.styles.overline },
});

export default MoneyScreen;

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import FormDateField from '../forms/FormDateField';
import { useTheme } from '../../context/ThemeContext';
import type { FinancialTransaction } from '../../services/financialTransactionService';
import type { CreateFinancialTransactionInput } from '../../services/financialTransactionService';
import type { Field } from '../../services/fieldService';
import {
  categoriesForType,
  financialCategoryLabel,
  financialSourceLabel,
  financialStatusLabel,
  financialTypeLabel,
  isRawFinancialValue,
  paymentMethodLabel,
  unassignedFieldLabel,
} from '../../finance/display';
import { formatOfficialAmount } from '../../finance/format';
import { formatQuantityLine } from '../../finance/moneyUi';
import { parseDecimal } from '../../finance/quantityCalculator';
import { harvestYearRangeLabel, harvestYearSpan } from '../../finance/harvestYear';
import { agriculturalYearFor } from '../../chronologio/agriculturalYear';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { radii, spacing, typography } from '../../theme';

type Props = {
  transaction: FinancialTransaction | null;
  fieldName?: string;
  relatedTaskTitle?: string;
  relatedHarvestTitle?: string;
  canManage: boolean;
  fields?: Field[];
  onClose: () => void;
  onVoid: (id: string, reason: string) => Promise<void>;
  onPostDraft: (id: string) => Promise<void>;
  onDeleteDraft: (id: string) => Promise<void>;
  onUpdate: (
    id: string,
    input: Partial<CreateFinancialTransactionInput> & { clearField?: boolean }
  ) => Promise<void>;
  onOpenTask?: (taskId: string) => void;
  onOpenHarvest?: (payload: { fieldId?: string; harvestId?: string; day: string }) => void;
};

const labelOr = (raw: string | undefined, fallback: string) =>
  raw && !isRawFinancialValue(raw) ? raw : fallback;

const MoneyTransactionDrawer: React.FC<Props> = ({
  transaction,
  fieldName,
  relatedTaskTitle,
  relatedHarvestTitle,
  canManage,
  fields = [],
  onClose,
  onVoid,
  onPostDraft,
  onDeleteDraft,
  onUpdate,
  onOpenTask,
  onOpenHarvest,
}) => {
  const { t, i18n } = useTranslation(['money', 'common']);
  const { colors, fontScaleMultiplier } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [occurredOn, setOccurredOn] = useState('');
  const [notes, setNotes] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [category, setCategory] = useState('');
  const [fieldId, setFieldId] = useState('');
  const locale = i18n.language;

  useEffect(() => {
    setBusy(false);
    setError(null);
    setConfirmVoid(false);
    setVoidReason('');
    setEditing(false);
    if (!transaction) return;
    setDescription(transaction.description || '');
    setAmountText(
      new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(transaction.amount)
    );
    setOccurredOn(transaction.occurredOn.slice(0, 10));
    setNotes(transaction.notes || '');
    setCounterparty(transaction.counterpartyName || '');
    setCategory(transaction.category || '');
    setFieldId(transaction.fieldId || '');
  }, [locale, transaction]);

  const canEdit = Boolean(transaction && canManage && transaction.status !== 'void');

  const seedEditor = () => {
    if (!transaction) return;
    setDescription(transaction.description || '');
    setAmountText(
      new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(transaction.amount)
    );
    setOccurredOn(transaction.occurredOn.slice(0, 10));
    setNotes(transaction.notes || '');
    setCounterparty(transaction.counterpartyName || '');
    setCategory(transaction.category || '');
    setFieldId(transaction.fieldId || '');
    setError(null);
  };

  const quantityLine = useMemo(
    () =>
      transaction
        ? formatQuantityLine(
            transaction.quantity,
            transaction.quantityUnit,
            transaction.unitPrice,
            locale
          )
        : null,
    [locale, transaction]
  );

  const saveEdit = async () => {
    if (!transaction) return;
    const amount = parseDecimal(amountText);
    if (!amount || amount <= 0 || !description.trim() || !category) {
      setError(t('money:editInvalid'));
      return;
    }
    await run(async () => {
      await onUpdate(transaction.id, {
        description: description.trim(),
        amount,
        occurredOn: `${occurredOn}T00:00:00`,
        resultYear: agriculturalYearFor(occurredOn),
        category,
        notes: notes.trim(),
        counterpartyName: counterparty.trim(),
        calculationMode: 'total_only',
        quantity: transaction.quantity ?? undefined,
        quantityUnit: transaction.quantityUnit ?? undefined,
        unitPrice: transaction.unitPrice ?? undefined,
        ...(fieldId ? { fieldId } : { clearField: true }),
      });
      setEditing(false);
    });
  };

  const run = async (action: () => Promise<void>) => {
    try {
      setBusy(true);
      setError(null);
      await action();
    } catch {
      setError(t('money:actionFailed'));
    } finally {
      setBusy(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <Sheet
      open={Boolean(transaction)}
      onClose={onClose}
      edge="end"
      size="lg"
      title={transaction?.description}
      subtitle={
        transaction
          ? labelOr(transaction.typeLabel, financialTypeLabel(transaction.type, locale))
          : undefined
      }
      footer={
        transaction && canManage ? (
          <View style={{ gap: spacing.sm }}>
            {editing ? (
              <>
                <Button title={t('money:saveEntry')} disabled={busy} onPress={() => void saveEdit()} />
                <Button
                  title={t('common:cancel', { defaultValue: 'Cancel' })}
                  variant="outline"
                  disabled={busy}
                  onPress={() => {
                    seedEditor();
                    setEditing(false);
                  }}
                />
              </>
            ) : null}
            {!editing && canEdit ? (
              <Button
                title={t('money:editEntry')}
                variant="outline"
                disabled={busy}
                onPress={() => {
                  seedEditor();
                  setEditing(true);
                }}
              />
            ) : null}
            {!editing && transaction.status === 'draft' ? (
              <>
                <Button
                  title={t('money:postDraft')}
                  disabled={busy}
                  onPress={() => void run(() => onPostDraft(transaction.id))}
                />
                <Button
                  title={t('money:deleteDraft')}
                  variant="outline"
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(t('money:deleteDraft'), t('money:deleteDraftConfirm'), [
                      { text: t('common:cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
                      {
                        text: t('money:deleteDraft'),
                        style: 'destructive',
                        onPress: () => void run(() => onDeleteDraft(transaction.id)),
                      },
                    ])
                  }
                />
              </>
            ) : null}
            {!editing && transaction.status === 'posted' ? (
              confirmVoid ? (
                <>
                  <Button
                    title={t('money:voidPosted')}
                    disabled={busy || !voidReason.trim()}
                    onPress={() => void run(() => onVoid(transaction.id, voidReason.trim()))}
                  />
                  <Button
                    title={t('common:cancel', { defaultValue: 'Cancel' })}
                    variant="outline"
                    onPress={() => setConfirmVoid(false)}
                  />
                </>
              ) : (
                <Button
                  title={t('money:voidPosted')}
                  variant="outline"
                  onPress={() => setConfirmVoid(true)}
                />
              )
            ) : null}
          </View>
        ) : undefined
      }
    >
      {transaction && editing ? (
        <View style={styles.detail}>
          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>{t('money:amount')}</Text>
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            style={[
              styles.voidInput,
              { color: colors.textPrimary, borderColor: colors.borderLight, backgroundColor: colors.surfaceElevated },
            ]}
          />
          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>{t('money:description')}</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[
              styles.voidInput,
              { color: colors.textPrimary, borderColor: colors.borderLight, backgroundColor: colors.surfaceElevated },
            ]}
          />
          <FormDateField label={t('money:date')} value={occurredOn} onValueChange={setOccurredOn} />
          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>{t('money:category')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {categoriesForType(transaction.type).map((item) => {
              const on = category === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[
                    styles.chip,
                    {
                      borderColor: on ? colors.oliveBorder : colors.borderLight,
                      backgroundColor: on ? colors.primaryLight : colors.surface,
                    },
                  ]}
                >
                  <Text style={{ color: on ? colors.primary : colors.textSecondary, fontWeight: '600' }}>
                    {financialCategoryLabel(item, locale)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>{t('money:field')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Pressable
              onPress={() => setFieldId('')}
              style={[
                styles.chip,
                {
                  borderColor: !fieldId ? colors.oliveBorder : colors.borderLight,
                  backgroundColor: !fieldId ? colors.primaryLight : colors.surface,
                },
              ]}
            >
              <Text style={{ color: !fieldId ? colors.primary : colors.textSecondary, fontWeight: '600' }}>
                {unassignedFieldLabel(locale)}
              </Text>
            </Pressable>
            {fields.map((field) => {
              const on = fieldId === field.id;
              return (
                <Pressable
                  key={field.id}
                  onPress={() => setFieldId(field.id)}
                  style={[
                    styles.chip,
                    {
                      borderColor: on ? colors.oliveBorder : colors.borderLight,
                      backgroundColor: on ? colors.primaryLight : colors.surface,
                    },
                  ]}
                >
                  <Text style={{ color: on ? colors.primary : colors.textSecondary, fontWeight: '600' }}>
                    {friendlyFieldLabel(field.name)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>{t('money:counterparty')}</Text>
          <TextInput
            value={counterparty}
            onChangeText={setCounterparty}
            style={[
              styles.voidInput,
              { color: colors.textPrimary, borderColor: colors.borderLight, backgroundColor: colors.surfaceElevated },
            ]}
          />
          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>{t('money:notes')}</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            style={[
              styles.voidInput,
              {
                color: colors.textPrimary,
                borderColor: colors.borderLight,
                backgroundColor: colors.surfaceElevated,
                minHeight: 72,
              },
            ]}
          />
          {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
        </View>
      ) : transaction ? (
        <View style={styles.detail}>
          <Text
            style={{
              fontSize: 32 * fontScaleMultiplier,
              fontWeight: '700',
              letterSpacing: -0.8,
              color: transaction.type === 'income' ? colors.eventIncome : colors.textPrimary,
              fontVariant: ['tabular-nums'],
            }}
          >
            {transaction.type === 'income' ? '+' : '−'}
            {formatOfficialAmount(transaction.amount, transaction.currency, locale, t('money:unknownAmount'))}
          </Text>
          {quantityLine ? (
            <Text style={{ color: colors.textSecondary }}>{quantityLine}</Text>
          ) : null}

          <View
            style={[
              styles.statusPill,
              {
                backgroundColor:
                  transaction.status === 'draft'
                    ? colors.primaryLight
                    : transaction.status === 'void'
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
                  transaction.status === 'draft'
                    ? colors.primary
                    : transaction.status === 'void'
                      ? colors.errorDark
                      : colors.textSecondary,
              }}
            >
              {labelOr(transaction.statusLabel, financialStatusLabel(transaction.status, locale))}
            </Text>
          </View>

          <Fact
            label={t('money:category')}
            value={
              transaction.category
                ? labelOr(transaction.categoryLabel, financialCategoryLabel(transaction.category, locale))
                : '—'
            }
          />
          <Fact label={t('money:date')} value={formatDate(transaction.occurredOn)} />
          <Fact
            label={t('money:harvestYearName')}
            value={`${harvestYearSpan(transaction.resultYear)} · ${harvestYearRangeLabel(transaction.resultYear, locale)}`}
          />
          <Fact
            label={t('money:field')}
            value={
              transaction.fieldId
                ? friendlyFieldLabel(fieldName || transaction.fieldId)
                : unassignedFieldLabel(locale)
            }
          />
          {transaction.relatedTaskId ? (
            <Pressable
              onPress={() => onOpenTask?.(transaction.relatedTaskId!)}
              disabled={!onOpenTask}
            >
              <Fact
                label={t('money:relatedTask')}
                value={relatedTaskTitle || t('money:relatedTask')}
                link={Boolean(onOpenTask)}
              />
            </Pressable>
          ) : null}
          {transaction.relatedHarvestId || transaction.sourceType === 'harvest' ? (
            <Pressable
              onPress={() =>
                onOpenHarvest?.({
                  fieldId: transaction.fieldId || undefined,
                  harvestId: transaction.relatedHarvestId || undefined,
                  day: transaction.occurredOn.slice(0, 10),
                })
              }
              disabled={!onOpenHarvest}
            >
              <Fact
                label={t('money:relatedHarvest')}
                value={relatedHarvestTitle || t('money:openHarvestDay')}
                link={Boolean(onOpenHarvest)}
              />
            </Pressable>
          ) : null}
          {transaction.paymentMethod ? (
            <Fact
              label={t('money:payment')}
              value={paymentMethodLabel(transaction.paymentMethod, locale)}
            />
          ) : null}
          {transaction.counterpartyName ? (
            <Fact label={t('money:counterparty')} value={transaction.counterpartyName} />
          ) : null}
          <Fact
            label={t('money:receipts')}
            value={
              transaction.attachmentIds.length
                ? t('money:receiptCount', { count: transaction.attachmentIds.length })
                : t('money:noReceipts')
            }
          />
          <Fact
            label={t('money:source')}
            value={
              labelOr(
                transaction.sourceTypeLabel,
                financialSourceLabel(
                  transaction.sourceType as 'manual' | 'task' | 'harvest' | 'service',
                  locale
                )
              ) + (transaction.sourceType === 'harvest' ? ` · ${t('money:harvestExpenseHere')}` : '')
            }
          />
          <Fact label={t('money:createdAt', { date: '' }).trim()} value={formatDateTime(transaction.createdAt)} />
          {transaction.postedAt ? (
            <Fact label={t('money:postedAt', { date: '' }).trim()} value={formatDateTime(transaction.postedAt)} />
          ) : null}
          {transaction.voidedAt ? (
            <Fact label={t('money:voidedAt', { date: '' }).trim()} value={formatDateTime(transaction.voidedAt)} />
          ) : null}
          {transaction.voidReason ? (
            <Fact label={t('money:voidReason')} value={transaction.voidReason} />
          ) : null}
          {transaction.notes ? <Fact label={t('money:notes')} value={transaction.notes} /> : null}

          {confirmVoid ? (
            <View style={styles.voidBox}>
              <Text style={{ color: colors.textSecondary }}>{t('money:voidConfirm')}</Text>
              <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>
                {t('money:voidReasonPrompt')}
              </Text>
              <TextInput
                value={voidReason}
                onChangeText={setVoidReason}
                placeholder={t('money:voidReasonPrompt')}
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.voidInput,
                  {
                    color: colors.textPrimary,
                    borderColor: colors.borderLight,
                    backgroundColor: colors.surfaceElevated,
                  },
                ]}
              />
            </View>
          ) : null}
          {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
        </View>
      ) : null}
    </Sheet>
  );
};

const Fact: React.FC<{ label: string; value: string; link?: boolean }> = ({ label, value, link }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.detailLine}>
      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text
        style={{
          color: link ? colors.primary : colors.textPrimary,
          fontWeight: '600',
          fontSize: 15,
        }}
      >
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  detail: { gap: spacing.md },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detailLine: { gap: 4 },
  detailLabel: { ...typography.styles.overline },
  voidBox: { gap: spacing.sm },
  chipRow: { gap: spacing.sm, paddingVertical: 2 },
  chip: {
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  voidInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
});

export default MoneyTransactionDrawer;

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import type { FinancialTransaction } from '../../services/financialTransactionService';
import {
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
import { harvestYearRangeLabel, harvestYearSpan } from '../../finance/harvestYear';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { radii, spacing, typography } from '../../theme';

type Props = {
  transaction: FinancialTransaction | null;
  fieldName?: string;
  relatedTaskTitle?: string;
  relatedHarvestTitle?: string;
  canManage: boolean;
  onClose: () => void;
  onVoid: (id: string, reason: string) => Promise<void>;
  onPostDraft: (id: string) => Promise<void>;
  onDeleteDraft: (id: string) => Promise<void>;
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
  onClose,
  onVoid,
  onPostDraft,
  onDeleteDraft,
  onOpenTask,
  onOpenHarvest,
}) => {
  const { t, i18n } = useTranslation(['money', 'common']);
  const { colors, fontScaleMultiplier } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const locale = i18n.language;

  useEffect(() => {
    if (transaction) return;
    setBusy(false);
    setError(null);
    setConfirmVoid(false);
    setVoidReason('');
  }, [transaction]);

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
            {transaction.status === 'draft' ? (
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
            {transaction.status === 'posted' ? (
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
      {transaction ? (
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
  voidInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
});

export default MoneyTransactionDrawer;

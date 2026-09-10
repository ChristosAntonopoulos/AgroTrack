import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { CaptureContext, CaptureSavedDetail, CaptureSavedOptions } from '../../capture/types';
import { pickCapturePhotoUris, uploadCapturePhotoUris } from '../../capture/photos';
import { useTheme } from '../../context/ThemeContext';
import { useOfflineMode } from '../../context/OfflineContext';
import Button from '../ui/Button';
import type { Field } from '../../services/fieldService';
import type { FieldTask } from '../../services/fieldWorkService';
import type { HarvestRecord } from '../../services/harvestService';
import {
  getFinancialTransactionService,
  getHarvestService,
  getFieldWorkService,
} from '../../services/serviceFactory';
import {
  categoriesForType,
  defaultCategoryForType,
  financialCategoryLabel,
  financialTypeHelp,
  financialTypeLabel,
  paymentMethodLabel,
  PAYMENT_METHODS,
  resultYearHelp,
  unassignedFieldLabel,
  type FinancialTransactionType,
} from '../../finance/display';
import { rememberLastMoneyFieldId } from '../../finance/lastField';
import { spacing, typography } from '../../theme';

const LARGE_AMOUNT = 2000;
const MAX_PHOTOS = 5;

type Props = {
  context: CaptureContext;
  fields: Field[];
  canRecordIncome: boolean;
  canRecordExpense: boolean;
  isFullPicture: boolean;
  onSaved: (detail: CaptureSavedDetail, message: string, options?: CaptureSavedOptions) => void;
};

const todayIsoDate = (iso?: string): string => {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const yearFromDate = (isoDate: string): number => {
  const year = Number(isoDate.slice(0, 4));
  return Number.isFinite(year) ? year : new Date().getFullYear();
};

const parseAmount = (raw: string): number => {
  const value = Number(raw.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : NaN;
};

const newIdempotencyKey = (): string =>
  `money-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const MoneyCaptureForm: React.FC<Props> = ({
  context,
  fields,
  canRecordIncome,
  canRecordExpense,
  isFullPicture,
  onSaved,
}) => {
  const { t, i18n } = useTranslation(['capture']);
  const language = i18n.language || 'el';
  const { colors, tapMin } = useTheme();
  const { isOnline } = useOfflineMode();

  const preferredKind: FinancialTransactionType | null =
    context.preferredType === 'income' && canRecordIncome
      ? 'income'
      : context.preferredType === 'expense' && canRecordExpense
        ? 'expense'
        : null;

  const [kind, setKind] = useState<FinancialTransactionType | null>(preferredKind);
  const [amount, setAmount] = useState('');
  const [fieldId, setFieldId] = useState(context.fieldId || '');
  const [occurredOn, setOccurredOn] = useState(todayIsoDate(context.occurredAt));
  const [category, setCategory] = useState(defaultCategoryForType(preferredKind || 'expense'));
  const [description, setDescription] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [relatedTaskId, setRelatedTaskId] = useState(context.taskId || '');
  const [relatedHarvestId, setRelatedHarvestId] = useState(context.harvestId || '');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [notes, setNotes] = useState('');
  const [resultYear, setResultYear] = useState(yearFromDate(todayIsoDate(context.occurredAt)));
  const [resultYearTouched, setResultYearTouched] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const usableFields = useMemo(
    () => fields.filter((f) => (f.status || 'Active') !== 'Draft'),
    [fields]
  );

  useEffect(() => {
    if (preferredKind) {
      setKind(preferredKind);
      setCategory(defaultCategoryForType(preferredKind));
      return;
    }
    if (canRecordIncome && !canRecordExpense) {
      setKind('income');
      setCategory(defaultCategoryForType('income'));
    } else if (!canRecordIncome && canRecordExpense) {
      setKind('expense');
      setCategory(defaultCategoryForType('expense'));
    }
  }, [preferredKind, canRecordIncome, canRecordExpense]);

  useEffect(() => {
    if (context.fieldId) setFieldId(context.fieldId);
    if (context.taskId) setRelatedTaskId(context.taskId);
    if (context.harvestId) setRelatedHarvestId(context.harvestId);
  }, [context.fieldId, context.taskId, context.harvestId]);

  useEffect(() => {
    if (!fieldId) {
      setTasks([]);
      setHarvests([]);
      return;
    }
    let cancelled = false;
    void Promise.all([
      getFieldWorkService()
        .listFieldTasks({ fieldId })
        .catch(() => [] as FieldTask[]),
      getHarvestService().listByField(fieldId).catch(() => [] as HarvestRecord[]),
    ]).then(([nextTasks, nextHarvests]) => {
      if (cancelled) return;
      setTasks(nextTasks);
      setHarvests(nextHarvests);
    });
    return () => {
      cancelled = true;
    };
  }, [fieldId]);

  const selectKind = (next: FinancialTransactionType) => {
    setKind(next);
    setCategory(defaultCategoryForType(next));
  };

  const addPhotos = async (camera: boolean) => {
    const uris = await pickCapturePhotoUris({
      camera,
      remainingSlots: MAX_PHOTOS - photos.length,
      isOnline,
      offlineMessage: t('common:offline.photosRequireConnection', {
        defaultValue: 'Photos need a connection.',
      }),
    });
    if (uris.length) setPhotos((prev) => [...prev, ...uris]);
  };

  const confirmIfNeeded = (value: number, type: FinancialTransactionType): Promise<boolean> => {
    const derivedYear = yearFromDate(occurredOn);
    if (value < LARGE_AMOUNT && resultYear === derivedYear) return Promise.resolve(true);
    const fieldName = usableFields.find((f) => f.id === fieldId)?.name || unassignedFieldLabel(language);
    const summary = t('capture:money.confirmSummary', {
      type: financialTypeLabel(type, language),
      amount: String(value),
      field: fieldName,
      date: occurredOn,
      year: resultYear,
    });
    return new Promise((resolve) => {
      Alert.alert('', summary, [
        { text: t('capture:cancel', { defaultValue: 'Cancel' }), style: 'cancel', onPress: () => resolve(false) },
        { text: t('common:ok', { defaultValue: 'OK' }), onPress: () => resolve(true) },
      ]);
    });
  };

  const save = async (saveAsDraft: boolean) => {
    if (!kind) return;
    const value = parseAmount(amount);
    if (!value || value <= 0) {
      Alert.alert('', t('capture:errors.amountRequired'));
      return;
    }
    if (!saveAsDraft && !description.trim()) {
      Alert.alert('', t('capture:money.descriptionRequired'));
      return;
    }
    if (!saveAsDraft && !(await confirmIfNeeded(value, kind))) return;

    setSubmitting(true);
    try {
      const attachmentIds = photos.length ? await uploadCapturePhotoUris(photos) : [];
      const created = await getFinancialTransactionService().create({
        type: kind,
        amount: value,
        currency: 'EUR',
        occurredOn: `${occurredOn}T00:00:00`,
        resultYear,
        fieldId: fieldId || undefined,
        category,
        description: description.trim() || financialCategoryLabel(category, language),
        paymentMethod: paymentMethod || undefined,
        counterpartyName: counterpartyName.trim() || undefined,
        relatedTaskId: relatedTaskId || undefined,
        relatedHarvestId: relatedHarvestId || undefined,
        sourceType: relatedHarvestId ? 'harvest' : relatedTaskId ? 'task' : 'manual',
        sourceId: relatedHarvestId || relatedTaskId || undefined,
        attachmentIds,
        notes: notes.trim() || undefined,
        saveAsDraft,
        idempotencyKey: newIdempotencyKey(),
      });
      await rememberLastMoneyFieldId(fieldId || undefined);
      const message = saveAsDraft
        ? t('capture:money.draftSaved')
        : kind === 'income'
          ? t('capture:income.saved')
          : t('capture:expense.saved');
      onSaved(
        { type: kind, fieldId: fieldId || '', sourceId: created.id },
        message,
        {
          transactionId: created.id,
          status: created.status === 'draft' ? 'draft' : 'posted',
          reopen: {
            fieldId: fieldId || undefined,
            taskId: relatedTaskId || undefined,
            harvestId: relatedHarvestId || undefined,
            preferredType: kind,
            occurredAt: context.occurredAt,
          },
        }
      );
    } catch {
      Alert.alert('', t('capture:errors.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!kind) {
    return (
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={[styles.prompt, { color: colors.textSecondary }]}>{t('capture:money.chooserTitle')}</Text>
        {!canRecordIncome && !canRecordExpense ? (
          <Text style={{ color: colors.textSecondary }}>{t('capture:money.noPermission')}</Text>
        ) : (
          <>
            {canRecordIncome ? (
              <Pressable
                style={[styles.typeCard, { borderColor: colors.border, minHeight: Math.max(88, tapMin + 24) }]}
                onPress={() => selectKind('income')}
                accessibilityRole="button"
                accessibilityLabel={`${financialTypeLabel('income', language)}. ${financialTypeHelp('income', language)}`}
              >
                <Ionicons name="arrow-up-circle-outline" size={28} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.typeTitle, { color: colors.textPrimary }]}>
                    {financialTypeLabel('income', language)}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>{financialTypeHelp('income', language)}</Text>
                </View>
              </Pressable>
            ) : null}
            {canRecordExpense ? (
              <Pressable
                style={[styles.typeCard, { borderColor: colors.border, minHeight: Math.max(88, tapMin + 24) }]}
                onPress={() => selectKind('expense')}
                accessibilityRole="button"
                accessibilityLabel={`${financialTypeLabel('expense', language)}. ${financialTypeHelp('expense', language)}`}
              >
                <Ionicons name="arrow-down-circle-outline" size={28} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.typeTitle, { color: colors.textPrimary }]}>
                    {financialTypeLabel('expense', language)}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>{financialTypeHelp('expense', language)}</Text>
                </View>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    );
  }

  const categories = categoriesForType(kind);

  return (
    <>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={[styles.kind, { color: colors.textPrimary }]}>
          {financialTypeLabel(kind, language)} · {financialTypeHelp(kind, language)}
        </Text>
        {!preferredKind ? (
          <Pressable onPress={() => setKind(null)} style={{ minHeight: tapMin, justifyContent: 'center' }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('capture:money.changeType')}</Text>
          </Pressable>
        ) : null}

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('capture:money.amount')}</Text>
        <View style={[styles.amountWrap, { borderColor: colors.border }]}>
          <Text style={[styles.euro, { color: colors.textSecondary }]}>€</Text>
          <TextInput
            style={[styles.amount, { color: colors.textPrimary }]}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            placeholder="0,00"
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel={t('capture:money.amount')}
          />
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('capture:fieldLabel')}</Text>
        <View style={styles.chipRow}>
          <Pressable
            style={[
              styles.chip,
              {
                borderColor: !fieldId ? colors.primary : colors.border,
                backgroundColor: !fieldId ? colors.primary + '22' : 'transparent',
                minHeight: tapMin,
              },
            ]}
            onPress={() => setFieldId('')}
          >
            <Text style={{ color: !fieldId ? colors.primary : colors.textPrimary }}>
              {unassignedFieldLabel(language)}
            </Text>
          </Pressable>
          {usableFields.map((f) => (
            <Pressable
              key={f.id}
              style={[
                styles.chip,
                {
                  borderColor: fieldId === f.id ? colors.primary : colors.border,
                  backgroundColor: fieldId === f.id ? colors.primary + '22' : 'transparent',
                  minHeight: tapMin,
                },
              ]}
              onPress={() => setFieldId(f.id)}
            >
              <Text style={{ color: fieldId === f.id ? colors.primary : colors.textPrimary }}>{f.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('capture:dateLabel')}</Text>
        <TextInput
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
          value={occurredOn}
          onChangeText={(value) => {
            setOccurredOn(value);
            if (!resultYearTouched) setResultYear(yearFromDate(value));
          }}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('capture:money.category')}</Text>
        <View style={styles.chipRow}>
          {categories.map((c) => (
            <Pressable
              key={c}
              style={[
                styles.chip,
                {
                  borderColor: category === c ? colors.primary : colors.border,
                  backgroundColor: category === c ? colors.primary + '22' : 'transparent',
                  minHeight: tapMin,
                },
              ]}
              onPress={() => setCategory(c)}
            >
              <Text style={{ color: category === c ? colors.primary : colors.textPrimary }}>
                {financialCategoryLabel(c, language)}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('capture:money.description')}
          placeholderTextColor={colors.textSecondary}
        />

        <Pressable onPress={() => setMoreOpen((v) => !v)} style={{ minHeight: tapMin, justifyContent: 'center' }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {moreOpen ? t('capture:less') : t('capture:more')}
          </Text>
        </Pressable>

        {moreOpen ? (
          <>
            {fieldId
              ? tasks.map((task) => (
                  <Pressable
                    key={task.id}
                    style={[
                      styles.chip,
                      {
                        borderColor: relatedTaskId === task.id ? colors.primary : colors.border,
                        minHeight: tapMin,
                      },
                    ]}
                    onPress={() => setRelatedTaskId(relatedTaskId === task.id ? '' : task.id)}
                  >
                    <Text style={{ color: colors.textPrimary }}>{task.title}</Text>
                  </Pressable>
                ))
              : null}
            {fieldId
              ? harvests.map((harvest) => (
                  <Pressable
                    key={harvest.id}
                    style={[
                      styles.chip,
                      {
                        borderColor: relatedHarvestId === harvest.id ? colors.primary : colors.border,
                        minHeight: tapMin,
                      },
                    ]}
                    onPress={() => setRelatedHarvestId(relatedHarvestId === harvest.id ? '' : harvest.id)}
                  >
                    <Text style={{ color: colors.textPrimary }}>
                      {harvest.harvestDate.slice(0, 10)}
                      {harvest.millName ? ` · ${harvest.millName}` : ''}
                    </Text>
                  </Pressable>
                ))
              : null}
            {isFullPicture ? (
              <>
                {PAYMENT_METHODS.map((method) => (
                  <Pressable
                    key={method}
                    style={[
                      styles.chip,
                      {
                        borderColor: paymentMethod === method ? colors.primary : colors.border,
                        minHeight: tapMin,
                      },
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text style={{ color: colors.textPrimary }}>{paymentMethodLabel(method, language)}</Text>
                  </Pressable>
                ))}
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                  value={counterpartyName}
                  onChangeText={setCounterpartyName}
                  placeholder={t('capture:money.counterparty')}
                  placeholderTextColor={colors.textSecondary}
                />
                <Button title={t('capture:money.addReceipt')} onPress={() => void addPhotos(true)} variant="outline" size="large" />
              </>
            ) : null}
            <TextInput
              style={[styles.input, styles.textarea, { color: colors.textPrimary, borderColor: colors.border }]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('capture:money.notes')}
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <Text style={[styles.hint, { color: colors.textSecondary }]}>{resultYearHelp(language)}</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              keyboardType="number-pad"
              value={String(resultYear)}
              onChangeText={(value) => {
                setResultYear(Number(value) || resultYear);
                setResultYearTouched(true);
              }}
              accessibilityLabel={t('capture:money.resultYear')}
            />
            <Button
              title={t('capture:money.saveDraft')}
              onPress={() => void save(true)}
              variant="outline"
              size="large"
              disabled={submitting}
            />
          </>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          title={
            submitting
              ? t('capture:saving')
              : kind === 'income'
                ? t('capture:money.saveIncome')
                : t('capture:money.saveExpense')
          }
          onPress={() => void save(false)}
          loading={submitting}
          fullWidth
          size="large"
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  body: { padding: spacing.md, paddingBottom: 24 },
  prompt: { fontSize: 16, marginBottom: 12 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  typeTitle: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  kind: { ...typography.styles.h3, fontWeight: '700', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 10, fontSize: 16 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 64,
    marginBottom: 10,
  },
  euro: { fontSize: 24, fontWeight: '700', marginRight: 8 },
  amount: { flex: 1, fontSize: 28, fontWeight: '700', minHeight: 56 },
  hint: { fontSize: 13, marginBottom: 6 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
});

export default MoneyCaptureForm;

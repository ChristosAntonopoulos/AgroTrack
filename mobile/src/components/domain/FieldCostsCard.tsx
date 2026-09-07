import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import Button from '../ui/Button';
import FormDateField from '../forms/FormDateField';
import {
  CreateFinancialEntryInput,
  FieldFinancialSummary,
  FinancialBucket,
  FinancialEntry,
} from '../../services/financialEntryService';
import { Task } from '../../services/taskService';
import { radii, spacing, typography } from '../../theme';

const BUCKETS: FinancialBucket[] = ['labor', 'inputs', 'harvest', 'other'];
const CATEGORIES = ['labor', 'mill_cost', 'harvest_workers', 'fertilizers', 'other'] as const;

const todayIso = () => new Date().toISOString().slice(0, 10);

type Props = {
  fieldId: string;
  lifecycleYear?: string;
  entries: FinancialEntry[];
  summary: FieldFinancialSummary | null;
  canAdd: boolean;
  canVoid?: boolean;
  tasks?: Task[];
  autoFocus?: boolean;
  onCreate: (input: CreateFinancialEntryInput) => Promise<FinancialEntry>;
  onVoid?: (id: string) => Promise<void>;
};

const formatMoney = (amount: number, currency = 'EUR') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);

const FieldCostsCard: React.FC<Props> = ({
  fieldId,
  lifecycleYear,
  entries,
  summary,
  canAdd,
  canVoid = false,
  tasks = [],
  autoFocus = false,
  onCreate,
  onVoid,
}) => {
  const { t } = useTranslation(['fields', 'common']);
  const { colors } = useTheme();
  const { tapMin, isFullPicture } = usePreferences();
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [bucket, setBucket] = useState<FinancialBucket | ''>('');
  const [date, setDate] = useState(todayIso());
  const [changeDay, setChangeDay] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [category, setCategory] = useState('');
  const [taskId, setTaskId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<FinancialEntry | null>(null);

  const posted = useMemo(
    () => entries.filter((e) => e.status === 'posted').slice(0, 5),
    [entries]
  );

  const spent = summary?.totalExpenses ?? 0;
  const received = summary?.totalIncome ?? 0;
  const left = summary?.net ?? received - spent;
  const currency = summary?.currency ?? 'EUR';
  const hasMoney = spent > 0 || received > 0;
  const bucketLabel = (value: FinancialBucket) => t(`fields:costs.buckets.${value}`);
  const isPresetDescription = BUCKETS.some((value) => description === bucketLabel(value));

  const chooseBucket = (value: FinancialBucket) => {
    const next = bucket === value ? '' : value;
    setBucket(next);
    if (!next) {
      if (isPresetDescription) setDescription('');
      setShowNote(false);
      return;
    }
    if (next === 'other') {
      if (isPresetDescription) setDescription('');
      setShowNote(true);
      return;
    }
    if (!description.trim() || isPresetDescription) {
      setDescription(bucketLabel(next));
    }
    setShowNote(false);
  };

  const resolvedDescription = () => {
    const typed = description.trim();
    if (typed) return typed;
    if (bucket && bucket !== 'other') return bucketLabel(bucket);
    return '';
  };

  const handleSave = async () => {
    const parsed = Number(amount.replace(',', '.'));
    const whatFor = resolvedDescription();
    if (!whatFor) {
      setError(t('fields:costs.descriptionRequired'));
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError(t('fields:costs.amountRequired'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await onCreate({
        fieldId,
        amount: parsed,
        description: whatFor,
        currency: 'EUR',
        kind,
        bucket: bucket || undefined,
        category: category || undefined,
        taskId: taskId || undefined,
        lifecycleYear,
        occurredOn: new Date(`${date}T12:00:00`).toISOString(),
      });
      setSaved(created);
      setAmount('');
      setDescription('');
      setBucket('');
      setCategory('');
      setTaskId('');
      setDate(todayIso());
      setChangeDay(false);
      setShowNote(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('fields:costs.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmVoid = (id: string) => {
    if (!onVoid) return;
    Alert.alert(t('fields:costs.wrongTitle'), t('fields:costs.wrongConfirm'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('fields:costs.thatWasWrong'),
        style: 'destructive',
        onPress: async () => {
          try {
            await onVoid(id);
            if (saved?.id === id) setSaved(null);
          } catch (err) {
            Alert.alert(
              t('fields:costs.wrongTitle'),
              err instanceof Error ? err.message : t('fields:costs.voidFailed')
            );
          }
        },
      },
    ]);
  };

  const fatTap = Math.max(tapMin, 56);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: autoFocus ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('fields:costs.title')}</Text>

      {hasMoney ? (
        <View style={[styles.hero, { backgroundColor: colors.surfaceMuted }]}>
          <Text style={[styles.heroAmount, { color: colors.textPrimary }]}>
            {formatMoney(left, currency)}
          </Text>
          <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
            {t('fields:costs.left')}
          </Text>
          <View style={styles.heroSplit}>
            <Text style={[styles.heroSide, { color: colors.textSecondary }]}>
              {t('fields:costs.spent')} {formatMoney(spent, currency)}
            </Text>
            <Text style={[styles.heroSide, { color: colors.successDark }]}>
              {t('fields:costs.received')} {formatMoney(received, currency)}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('fields:costs.emptyHint')}</Text>
      )}

      {saved ? (
        <View style={[styles.success, { backgroundColor: colors.success + '18' }]}>
          <Text style={[styles.successText, { color: colors.textPrimary }]}>
            {t('fields:costs.saved', {
              amount: formatMoney(saved.amount, saved.currency),
            })}
          </Text>
          {canVoid && onVoid ? (
            <Pressable onPress={() => confirmVoid(saved.id)} style={{ minHeight: tapMin, justifyContent: 'center' }}>
              <Text style={[styles.undo, { color: colors.primaryDark }]}>{t('fields:costs.thatWasWrong')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {canAdd ? (
        <View style={styles.form}>
          <View style={styles.kindRow} accessibilityRole="tablist">
            {(['expense', 'income'] as const).map((value) => {
              const active = kind === value;
              const paid = value === 'expense';
              return (
                <Pressable
                  key={value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setKind(value)}
                  style={[
                    styles.kindCard,
                    {
                      minHeight: fatTap + 8,
                      borderColor: active
                        ? paid
                          ? colors.secondary
                          : colors.success
                        : colors.border,
                      backgroundColor: active
                        ? paid
                          ? colors.warningLight
                          : colors.successLight
                        : colors.background,
                    },
                  ]}
                >
                  <Text style={[styles.kindTitle, { color: colors.textPrimary }]}>
                    {t(`fields:costs.kinds.${value}`)}
                  </Text>
                  <Text style={[styles.kindHint, { color: colors.textSecondary }]}>
                    {t(`fields:costs.kindHints.${value}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{t('fields:costs.amount')}</Text>
          <View
            style={[
              styles.amountRow,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                minHeight: fatTap,
              },
            ]}
          >
            <Text style={[styles.euro, { color: colors.textSecondary }]}>€</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="80"
              placeholderTextColor={colors.textTertiary}
              style={[styles.amountInput, { color: colors.textPrimary }]}
              accessibilityLabel={t('fields:costs.amount')}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{t('fields:costs.whatFor')}</Text>
          <View style={styles.bucketGrid}>
            {BUCKETS.map((value) => {
              const active = bucket === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => chooseBucket(value)}
                  style={[
                    styles.bucket,
                    {
                      minHeight: fatTap,
                      borderColor: active ? colors.primaryDark : colors.border,
                      backgroundColor: active ? colors.primaryDark : colors.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.bucketText,
                      { color: active ? colors.textInverse : colors.textPrimary },
                    ]}
                  >
                    {bucketLabel(value)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {showNote || bucket === 'other' ? (
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('fields:costs.whatForPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.noteInput,
                {
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  minHeight: fatTap,
                },
              ]}
            />
          ) : (
            <Pressable
              onPress={() => setShowNote(true)}
              style={{ minHeight: tapMin, justifyContent: 'center' }}
            >
              <Text style={[styles.link, { color: colors.primaryDark }]}>{t('fields:costs.addNote')}</Text>
            </Pressable>
          )}

          <View style={styles.dateRow}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
              {t('fields:costs.todayDefault', { date })}
            </Text>
            <Pressable onPress={() => setChangeDay((v) => !v)} style={{ minHeight: tapMin, justifyContent: 'center' }}>
              <Text style={[styles.link, { color: colors.primaryDark }]}>
                {t('fields:costs.changeDay')}
              </Text>
            </Pressable>
          </View>
          {changeDay ? (
            <FormDateField
              label={t('fields:costs.date')}
              value={date}
              onValueChange={setDate}
              maximumDate={new Date()}
            />
          ) : null}

          {isFullPicture ? (
            showMore ? (
              <View style={styles.moreBlock}>
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>
                  {t('fields:costs.moreDetail')}
                </Text>
                <View style={styles.moreChips}>
                  {CATEGORIES.map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => setCategory((current) => (current === value ? '' : value))}
                      style={[
                        styles.moreChip,
                        {
                          minHeight: tapMin,
                          borderColor: category === value ? colors.primary : colors.border,
                          backgroundColor: category === value ? colors.primaryLight : colors.background,
                        },
                      ]}
                    >
                      <Text style={{ color: colors.textPrimary }}>
                        {t(`fields:costs.categories.${value}`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {tasks.length > 0 ? (
                  <View style={styles.moreChips}>
                    {tasks.slice(0, 6).map((task) => (
                      <Pressable
                        key={task.id}
                        onPress={() => setTaskId((current) => (current === task.id ? '' : task.id))}
                        style={[
                          styles.moreChip,
                          {
                            minHeight: tapMin,
                            borderColor: taskId === task.id ? colors.primary : colors.border,
                            backgroundColor: taskId === task.id ? colors.primaryLight : colors.background,
                          },
                        ]}
                      >
                        <Text style={{ color: colors.textPrimary }} numberOfLines={1}>
                          {task.title}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : (
              <Pressable
                onPress={() => setShowMore(true)}
                style={{ minHeight: tapMin, justifyContent: 'center' }}
              >
                <Text style={[styles.link, { color: colors.primaryDark }]}>
                  {t('fields:costs.moreDetail')}
                </Text>
              </Pressable>
            )
          ) : null}

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
          <Button
            title={kind === 'income' ? t('fields:costs.saveIn') : t('fields:costs.saveOut')}
            onPress={handleSave}
            loading={submitting}
            fullWidth
            size="large"
          />
        </View>
      ) : null}

      {posted.map((entry) => (
        <View key={entry.id} style={[styles.row, { borderTopColor: colors.border }]}>
          <View style={styles.rowText}>
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{entry.description}</Text>
            {entry.bucket && bucketLabel(entry.bucket) !== entry.description ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {bucketLabel(entry.bucket)}
              </Text>
            ) : !entry.bucket ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {t('fields:costs.uncategorized')}
              </Text>
            ) : null}
          </View>
          <Text
            style={{
              color: entry.kind === 'income' ? colors.successDark : colors.textPrimary,
              fontWeight: '700',
            }}
          >
            {entry.kind === 'income' ? '+' : '−'}
            {formatMoney(entry.amount, entry.currency)}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    gap: spacing.md,
  },
  title: {
    ...typography.styles.h6,
    fontWeight: '700',
  },
  hint: {
    ...typography.styles.body,
    lineHeight: 22,
  },
  hero: {
    borderRadius: radii.lg,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  heroLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  heroSplit: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  heroSide: {
    fontSize: 14,
    fontWeight: '600',
  },
  success: {
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 4,
  },
  successText: {
    fontWeight: '700',
    fontSize: 16,
  },
  undo: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  form: {
    gap: spacing.sm,
  },
  kindRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kindCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  kindTitle: {
    fontWeight: '800',
    fontSize: 18,
  },
  kindHint: {
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
  },
  fieldLabel: {
    fontWeight: '700',
    fontSize: 16,
    marginTop: 4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
  },
  euro: {
    fontSize: 22,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    paddingVertical: 8,
  },
  bucketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bucket: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 2,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  bucketText: {
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  link: {
    fontWeight: '700',
    fontSize: 16,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  moreBlock: {
    gap: 8,
  },
  moreChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moreChip: {
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: radii.full,
    justifyContent: 'center',
  },
  error: {
    fontSize: 15,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
});

export default FieldCostsCard;

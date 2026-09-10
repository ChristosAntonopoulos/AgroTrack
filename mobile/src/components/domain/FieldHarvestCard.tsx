import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import Button from '../ui/Button';
import FormDateField from '../forms/FormDateField';
import {
  CreateHarvestRecordInput,
  HarvestRecord,
} from '../../services/harvestService';
import { spacing, typography } from '../../theme';
import { formatKg } from '../../utils/harvestUtils';

type Props = {
  fieldId: string;
  records: HarvestRecord[];
  canAdd: boolean;
  canVoid: boolean;
  compact?: boolean;
  autoFocus?: boolean;
  mode?: 'daily' | 'final' | 'default';
  onCreate: (input: CreateHarvestRecordInput) => Promise<HarvestRecord>;
  onVoid: (id: string) => Promise<void>;
  onWriteMoneyIn?: () => void;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const FieldHarvestCard: React.FC<Props> = ({
  fieldId,
  records,
  canAdd,
  canVoid,
  compact = true,
  autoFocus = false,
  mode = 'default',
  onCreate,
  onVoid,
  onWriteMoneyIn,
}) => {
  const { t } = useTranslation(['fields', 'common']);
  const { colors } = useTheme();
  const { tapMin } = usePreferences();
  const isFinal = mode === 'final';
  const [date, setDate] = useState(todayIso());
  const [oliveKg, setOliveKg] = useState('');
  const [showMore, setShowMore] = useState(!compact || autoFocus || isFinal);
  const [oilKg, setOilKg] = useState('');
  const [millName, setMillName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<HarvestRecord | null>(null);

  const latest = useMemo(
    () => records.find((r) => r.status === 'posted') ?? null,
    [records]
  );

  const handleSave = async () => {
    const parsed = Number(oliveKg.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError(t('fields:harvest.oliveKgRequired'));
      return;
    }

    const oilParsed = oilKg.trim() ? Number(oilKg.replace(',', '.')) : undefined;
    if (oilParsed != null && (!Number.isFinite(oilParsed) || oilParsed <= 0)) {
      setError(t('fields:harvest.oilKgRequired'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await onCreate({
        fieldId,
        harvestDate: new Date(`${date}T12:00:00`).toISOString(),
        oliveKg: parsed,
        oilKg: oilParsed,
        millName: millName.trim() || undefined,
      });
      setSaved(created);
      setOliveKg('');
      setOilKg('');
      setMillName('');
      setDate(todayIso());
      if (compact) setShowMore(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('fields:harvest.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmVoid = (id: string) => {
    Alert.alert(t('fields:harvest.undoTitle'), t('fields:harvest.undoConfirm'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('fields:harvest.undo'),
        style: 'destructive',
        onPress: async () => {
          try {
            await onVoid(id);
            if (saved?.id === id) setSaved(null);
          } catch (err) {
            Alert.alert(
              t('fields:harvest.undoTitle'),
              err instanceof Error ? err.message : t('fields:harvest.undoFailed')
            );
          }
        },
      },
    ]);
  };

  const inputStyle = [
    styles.input,
    {
      color: colors.textPrimary,
      borderColor: colors.border,
      backgroundColor: colors.background,
      minHeight: tapMin,
    },
  ];

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
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {isFinal ? t('fields:harvest.finalTitle') : t('fields:harvest.title')}
      </Text>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        {isFinal
          ? t('fields:harvest.finalHint')
          : latest
            ? t('fields:harvest.lastSaved', { kg: formatKg(latest.oliveKg) })
            : t('fields:harvest.emptyHint')}
      </Text>

      {saved ? (
        <View style={[styles.success, { backgroundColor: colors.success + '18' }]}>
          <Text style={[styles.successText, { color: colors.textPrimary }]}>
            {t('fields:harvest.savedKg', { kg: formatKg(saved.oliveKg) })}
          </Text>
          {canVoid ? (
            <Pressable onPress={() => confirmVoid(saved.id)} style={{ minHeight: tapMin, justifyContent: 'center' }}>
              <Text style={[styles.undo, { color: colors.primaryDark }]}>{t('fields:harvest.undo')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {canAdd ? (
        <View style={styles.form}>
          <FormDateField
            label={t('fields:harvest.date')}
            value={date}
            onValueChange={setDate}
            maximumDate={new Date()}
          />
          <TextInput
            value={oliveKg}
            onChangeText={setOliveKg}
            keyboardType="decimal-pad"
            placeholder={t('fields:harvest.oliveKg')}
            placeholderTextColor={colors.textTertiary}
            style={inputStyle}
          />
          {showMore ? (
            <>
              <TextInput
                value={oilKg}
                onChangeText={setOilKg}
                keyboardType="decimal-pad"
                placeholder={t('fields:harvest.oilKg')}
                placeholderTextColor={colors.textTertiary}
                style={inputStyle}
              />
              <TextInput
                value={millName}
                onChangeText={setMillName}
                placeholder={t('fields:harvest.millName')}
                placeholderTextColor={colors.textTertiary}
                style={inputStyle}
              />
            </>
          ) : (
            <Pressable
              onPress={() => setShowMore(true)}
              style={{ minHeight: tapMin, justifyContent: 'center' }}
            >
              <Text style={[styles.more, { color: colors.primaryDark }]}>{t('fields:harvest.addMore')}</Text>
            </Pressable>
          )}
          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
          <Button
            title={isFinal ? t('fields:harvest.saveFinal') : t('fields:harvest.save')}
            onPress={handleSave}
            loading={submitting}
            fullWidth
          />
          {isFinal && onWriteMoneyIn ? (
            <Button
              title={t('fields:harvest.writeMoneyIn')}
              variant="outline"
              onPress={onWriteMoneyIn}
              fullWidth
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.styles.h6,
    fontWeight: '700',
  },
  hint: {
    ...typography.styles.body,
  },
  success: {
    borderRadius: 10,
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
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  more: {
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    fontSize: 13,
  },
});

export default FieldHarvestCard;

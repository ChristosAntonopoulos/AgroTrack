import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { formatKg } from '../../utils/harvestUtils';
import { HarvestSheetShell } from '../components/HarvestSheetShell';
import { formatHarvestOilAmount } from '../utils/harvestCalculations';
import FieldColorMark from '../../components/fields/FieldColorMark';

type Props = {
  record: {
    id: string;
    fieldId: string;
    harvestDate: string;
    oliveKg: number;
    oilKg?: number | null;
    oilLitres?: number | null;
    sackCount?: number;
    workersUsed: number;
    millName?: string;
    status?: string;
    notes?: string;
  };
  fieldName: string;
  fieldColor?: string | null;
  locale: string;
  canVoid: boolean;
  busy?: boolean;
  onVoid: () => void;
};

export const HarvestRecordSheet: React.FC<Props> = ({
  record,
  fieldName,
  fieldColor,
  locale,
  canVoid,
  busy,
  onVoid,
}) => {
  const { t } = useTranslation(['fields', 'chronologio']);
  const { colors } = useTheme();
  const dateLabel = new Date(record.harvestDate).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const hasLitres = record.oilLitres != null && record.oilLitres > 0;
  const hasKg = record.oilKg != null && record.oilKg > 0;

  return (
    <HarvestSheetShell
      footer={
        canVoid && record.status !== 'voided' ? (
          <Button
            title={t('chronologio:drawer.void', { defaultValue: 'Void' })}
            variant="outline"
            disabled={busy}
            onPress={onVoid}
            fullWidth
          />
        ) : undefined
      }
    >
      <View style={styles.titleRow}>
        <FieldColorMark color={fieldColor} fieldId={record.fieldId} size={14} />
        <Text style={[styles.prompt, { color: colors.textPrimary, flex: 1 }]}>
          {fieldName} · {dateLabel}
        </Text>
      </View>
      <View style={styles.facts}>
        <Text style={{ color: colors.textSecondary }}>{t('fields:harvestCampaign.record.olives')}</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{formatKg(record.oliveKg)}</Text>
        {record.sackCount != null && record.sackCount > 0 ? (
          <>
            <Text style={{ color: colors.textSecondary }}>{t('fields:harvestCampaign.sacks.unit')}</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{record.sackCount}</Text>
          </>
        ) : null}
        {hasLitres ? (
          <>
            <Text style={{ color: colors.textSecondary }}>{t('fields:harvestCampaign.record.oil')}</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {formatHarvestOilAmount(record.oilLitres, 'litres', locale)}
              {hasKg ? ` ≈ ${formatKg(record.oilKg!)}` : ''}
            </Text>
          </>
        ) : hasKg ? (
          <>
            <Text style={{ color: colors.textSecondary }}>{t('fields:harvestCampaign.record.oil')}</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{formatKg(record.oilKg!)}</Text>
          </>
        ) : null}
        <Text style={{ color: colors.textSecondary }}>{t('fields:harvestCampaign.record.people')}</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{record.workersUsed}</Text>
        {record.millName ? (
          <>
            <Text style={{ color: colors.textSecondary }}>{t('fields:harvestCampaign.record.mill')}</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{record.millName}</Text>
          </>
        ) : null}
      </View>
      {record.notes ? <Text style={{ color: colors.textSecondary }}>{record.notes}</Text> : null}
    </HarvestSheetShell>
  );
};

const styles = StyleSheet.create({
  prompt: { fontWeight: '700', fontSize: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  facts: { gap: 6 },
  value: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
});

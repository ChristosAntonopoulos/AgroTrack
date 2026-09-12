import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';
import type { HarvestRecord } from '../../services/harvestService';
import { spacing, typography, radii } from '../../theme';
import { formatKg } from '../../utils/harvestUtils';

type Props = {
  fieldId: string;
  records: HarvestRecord[];
  canAdd: boolean;
  canVoid: boolean;
  compact?: boolean;
  autoFocus?: boolean;
  mode?: 'daily' | 'final' | 'default';
  onLogHarvest: () => void;
  onOpenCampaign?: () => void;
  onVoid?: (id: string) => Promise<void>;
};

/**
 * Thin harvest summary on field detail. Create goes through Capture / campaign — not a third form.
 */
const FieldHarvestCard: React.FC<Props> = ({
  records,
  canAdd,
  canVoid,
  autoFocus = false,
  mode = 'default',
  onLogHarvest,
  onOpenCampaign,
  onVoid,
}) => {
  const { t } = useTranslation(['fields', 'common']);
  const { colors, tapMin } = useTheme();
  const isFinal = mode === 'final';

  const posted = useMemo(
    () => records.filter((r) => r.status === 'posted').slice(0, 3),
    [records]
  );
  const latest = posted[0] ?? null;
  const seasonKg = useMemo(
    () => posted.reduce((sum, row) => sum + (row.oliveKg || 0), 0),
    [posted]
  );

  const handleVoid = (id: string) => {
    if (!onVoid) return;
    Alert.alert(t('fields:harvest.voidTitle', { defaultValue: 'Void harvest?' }), undefined, [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('common:delete', { defaultValue: 'Void' }),
        style: 'destructive',
        onPress: () => void onVoid(id),
      },
    ]);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: autoFocus ? colors.primary : colors.borderLight,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {isFinal
          ? t('fields:harvest.finalTitle', { defaultValue: t('fields:harvest.title') })
          : t('fields:harvest.title', { defaultValue: 'Harvest' })}
      </Text>
      {seasonKg > 0 ? (
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {t('fields:harvest.seasonKg', {
            defaultValue: '{{kg}} kg this season',
            kg: formatKg(seasonKg),
          })}
        </Text>
      ) : (
        <Text style={[styles.meta, { color: colors.textTertiary }]}>
          {t('fields:harvest.emptyHint', { defaultValue: 'No harvest logged yet for this field.' })}
        </Text>
      )}

      {latest ? (
        <View style={styles.latest}>
          <Text style={[styles.latestLabel, { color: colors.textSecondary }]}>
            {latest.harvestDate?.slice(0, 10)} · {formatKg(latest.oliveKg)} kg
            {latest.millName ? ` · ${latest.millName}` : ''}
          </Text>
          {canVoid && onVoid ? (
            <Pressable onPress={() => handleVoid(latest.id)} hitSlop={8}>
              <Text style={{ color: colors.error, fontWeight: '600' }}>
                {t('fields:harvest.void', { defaultValue: 'Void' })}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        {canAdd ? (
          <Button
            title={t('fields:harvest.log', { defaultValue: 'Log harvest' })}
            onPress={onLogHarvest}
            fullWidth
          />
        ) : null}
        {onOpenCampaign ? (
          <Pressable
            onPress={onOpenCampaign}
            style={{ minHeight: tapMin, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {t('fields:harvestCampaign.title', { defaultValue: 'Harvest' })}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: { ...typography.styles.body, fontWeight: '700' },
  meta: { ...typography.styles.bodySmall },
  latest: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  latestLabel: { ...typography.styles.caption, flex: 1, fontWeight: '600' },
  actions: { gap: spacing.xs, marginTop: spacing.xs },
});

export default FieldHarvestCard;

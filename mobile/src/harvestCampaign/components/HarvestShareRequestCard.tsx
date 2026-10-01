import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { HarvestNumberStepper } from './HarvestNumberStepper';
import { oilStockService, type OilShareSource } from '../../services/oilStockService';
import { formatOilNumber, formatOilPack } from '../../myOil/formatOilPack';
import { radii, spacing, typography } from '../../theme';

type Props = {
  fieldIds: string[];
  source: OilShareSource;
  onSubmitted?: () => void;
};

export function HarvestShareRequestCard({ fieldIds, source, onSubmitted }: Props) {
  const { t, i18n } = useTranslation(['fields', 'myOil']);
  const { colors, tapMin } = useTheme();
  const [tin16, setTin16] = useState(0);
  const [tin17, setTin17] = useState(0);
  const [bulk, setBulk] = useState(0);
  const [custom, setCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const packLabels = useMemo(
    () => ({
      tin: (count: number, size: number) => t('myOil:tin', { count, size }),
      bulk: (amount: number) =>
        t('myOil:bulk', { amount: formatOilNumber(amount, i18n.language) }),
      litres: (amount: number) =>
        t('myOil:litres', { amount: formatOilNumber(amount, i18n.language) }),
    }),
    [t, i18n.language]
  );

  const freeLine = formatOilPack(source.available, packLabels);
  const canSubmit = tin16 > 0 || tin17 > 0 || bulk > 0.05;
  const tinSuffix = t('fields:harvestCampaign.oil.tinSuffix');

  // Almost every ask is "one or two tins". Only the rare exact amount needs the steppers.
  const quickCounts = [1, 2].filter((count) => source.available.tin17 >= count);
  const pickQuick = (count: number) => {
    setTin16(0);
    setTin17(count);
    setBulk(0);
    setCustom(false);
  };
  const quickPicked = (count: number) =>
    !custom && tin17 === count && tin16 === 0 && bulk <= 0.05;

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      await oilStockService.createShareRequest({
        fieldIds,
        requested: { tin16, tin17, bulkLitres: bulk },
      });
      setDone(true);
      setTin16(0);
      setTin17(0);
      setBulk(0);
      setCustom(false);
      onSubmitted?.();
      setTimeout(() => setDone(false), 4200);
    } catch {
      setError(t('fields:harvestCampaign.shareRequest.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={{
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.eventHarvest,
        backgroundColor: colors.eventHarvestSoft,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radii.lg,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.eventHarvest,
          }}
        >
          <Ionicons name="hand-left-outline" size={18} color="#fffaf0" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              ...typography.styles.bodySmall,
              fontWeight: '700',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: colors.textSecondary,
            }}
          >
            {t('fields:harvestCampaign.shareRequest.from', {
              name: source.fromDisplayName || t('fields:harvestCampaign.shareRequest.admin'),
            })}
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 }}>
            {t('fields:harvestCampaign.shareRequest.title')}
          </Text>
          {freeLine ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Ionicons name="water-outline" size={14} color={colors.eventHarvest} />
              <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>
                {t('fields:harvestCampaign.shareRequest.free', { pack: freeLine })}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {done ? (
        <Text style={{ fontWeight: '700', color: colors.primary }}>
          {t('fields:harvestCampaign.shareRequest.sent')}
        </Text>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[...quickCounts.map((count) => ({ count })), { count: null }].map((chip) => {
              const on = chip.count == null ? custom : quickPicked(chip.count);
              return (
                <Pressable
                  key={chip.count ?? 'custom'}
                  onPress={() =>
                    chip.count == null ? setCustom((v) => !v) : pickQuick(chip.count)
                  }
                  style={{
                    minHeight: Math.max(40, tapMin * 0.8),
                    paddingHorizontal: 14,
                    justifyContent: 'center',
                    borderRadius: radii.full,
                    borderWidth: 1,
                    borderColor: on ? colors.eventHarvest : colors.border,
                    backgroundColor: on ? colors.eventHarvestSoft : colors.surface,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: '700',
                      fontSize: 14,
                      color: on ? colors.eventHarvest : colors.textSecondary,
                    }}
                  >
                    {chip.count == null
                      ? t('fields:harvestCampaign.shareRequest.custom')
                      : t('fields:harvestCampaign.shareRequest.quickTins', { tins: chip.count })}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {custom ? (
            <>
              <HarvestNumberStepper
                label={t('fields:harvestCampaign.shareRequest.tin16')}
                value={tin16}
                onChange={(next) =>
                  setTin16(Math.max(0, Math.min(source.available.tin16, Math.round(next))))
                }
                min={0}
                suffix={tinSuffix}
              />
              <HarvestNumberStepper
                label={t('fields:harvestCampaign.shareRequest.tin17')}
                value={tin17}
                onChange={(next) =>
                  setTin17(Math.max(0, Math.min(source.available.tin17, Math.round(next))))
                }
                min={0}
                suffix={tinSuffix}
              />
              <HarvestNumberStepper
                label={t('fields:harvestCampaign.shareRequest.bulk')}
                value={bulk}
                onChange={(next) =>
                  setBulk(
                    Math.max(0, Math.min(source.available.bulkLitres, Math.round(next * 10) / 10))
                  )
                }
                min={0}
                step={0.1}
                suffix="L"
              />
            </>
          ) : null}
          {error ? (
            <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text>
          ) : null}
          <Pressable
            disabled={!canSubmit || busy}
            onPress={() => void submit()}
            style={{
              alignSelf: 'flex-start',
              minHeight: tapMin,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: radii.control,
              backgroundColor: canSubmit && !busy ? colors.primary : colors.surfaceMuted,
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: canSubmit && !busy ? '#fff' : colors.textTertiary,
                fontWeight: '700',
                fontSize: 15,
              }}
            >
              {t('fields:harvestCampaign.shareRequest.submit')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

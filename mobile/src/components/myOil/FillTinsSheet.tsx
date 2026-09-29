import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Sheet from '../ui/Sheet';
import { useTheme } from '../../context/ThemeContext';
import { formatOilNumber } from '../../myOil/formatOilPack';
import type { OilLot } from '../../services/oilStockService';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  open: boolean;
  lots: OilLot[];
  preferredLot?: OilLot | null;
  fieldNames?: Record<string, string>;
  busy: boolean;
  onClose: () => void;
  onSave: (lotId: string, add16: number, add17: number) => Promise<void>;
};

type Step = 'source' | 'fill';

const AUTO_SOURCE = '__auto__';

export function FillTinsSheet({
  open,
  lots,
  preferredLot,
  fieldNames = {},
  busy,
  onClose,
  onSave,
}: Props) {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const locale = i18n.language;

  const withBulk = useMemo(
    () =>
      [...lots]
        .filter((l) => l.packing.bulkLitres > 0.05)
        .sort((a, b) => new Date(a.pressedOn).getTime() - new Date(b.pressedOn).getTime()),
    [lots]
  );

  const [step, setStep] = useState<Step>('source');
  const [sourceKey, setSourceKey] = useState<string>(AUTO_SOURCE);
  const [add16, setAdd16] = useState(0);
  const [add17, setAdd17] = useState(0);

  useEffect(() => {
    if (!open) return;
    setAdd16(0);
    setAdd17(0);
    if (preferredLot && preferredLot.packing.bulkLitres > 0.05) {
      setSourceKey(preferredLot.id);
      setStep('fill');
    } else {
      setSourceKey(AUTO_SOURCE);
      setStep(withBulk.length > 1 ? 'source' : 'fill');
    }
  }, [open, preferredLot, withBulk.length]);

  const linkedLots = withBulk.filter((l) => (l.harvestRecordIds?.length || 0) > 0);
  const unlinkedLots = withBulk.filter((l) => (l.harvestRecordIds?.length || 0) === 0);

  const resolvedLot = useMemo(() => {
    if (sourceKey === AUTO_SOURCE) return withBulk[0] || null;
    return withBulk.find((l) => l.id === sourceKey) || withBulk[0] || null;
  }, [sourceKey, withBulk]);

  const bulk = resolvedLot?.packing.bulkLitres || 0;
  const used = add16 * 16 + add17 * 17;
  const left = Math.round((bulk - used) * 10) / 10;
  const canSave = !!resolvedLot && used > 0 && left >= -0.05;
  const wantsHarvestLink = sourceKey !== AUTO_SOURCE;

  const formatLotDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const fieldLabel = (lot: OilLot) => {
    const names = lot.fieldIds.map((id) => fieldNames[id]).filter(Boolean);
    if (!names.length) return null;
    if (names.length === 1) return names[0];
    return `${names[0]} +${names.length - 1}`;
  };

  const footer =
    withBulk.length === 0 ? (
      <View style={styles.footerRow}>
        <Pressable disabled={busy} onPress={onClose} style={styles.btnSecondary}>
          <Text style={styles.btnSecondaryText}>{t('fill.cancel')}</Text>
        </Pressable>
      </View>
    ) : step === 'source' ? (
      <View style={styles.footerRow}>
        <Pressable disabled={busy} onPress={onClose} style={styles.btnSecondary}>
          <Text style={styles.btnSecondaryText}>{t('fill.cancel')}</Text>
        </Pressable>
        <Pressable
          disabled={!resolvedLot}
          onPress={() => {
            setAdd16(0);
            setAdd17(0);
            setStep('fill');
          }}
          style={[styles.btnPrimary, !resolvedLot && styles.btnPrimaryDisabled]}
        >
          <Text style={styles.btnPrimaryText}>{t('fill.continue')}</Text>
        </Pressable>
      </View>
    ) : (
      <View style={styles.footerRow}>
        <Pressable
          disabled={busy}
          onPress={() => {
            if (preferredLot && withBulk.length <= 1) onClose();
            else setStep('source');
          }}
          style={styles.btnSecondary}
        >
          <Text style={styles.btnSecondaryText}>
            {withBulk.length > 1 || !preferredLot ? t('fill.back') : t('fill.cancel')}
          </Text>
        </Pressable>
        <Pressable
          disabled={busy || !canSave}
          onPress={() => resolvedLot && void onSave(resolvedLot.id, add16, add17)}
          style={[styles.btnPrimary, (busy || !canSave) && styles.btnPrimaryDisabled]}
        >
          <Text style={styles.btnPrimaryText}>{t('fill.save')}</Text>
        </Pressable>
      </View>
    );

  const renderSourceCard = (
    key: string,
    icon: React.ComponentProps<typeof Ionicons>['name'],
    title: string,
    sub?: string | null,
    meta?: string
  ) => (
    <Pressable
      key={key}
      onPress={() => setSourceKey(key)}
      style={[styles.sourceCard, sourceKey === key && styles.sourceCardOn]}
    >
      <View style={styles.sourceCardIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.sourceCardBody}>
        <Text style={styles.sourceCardTitle}>{title}</Text>
        {sub ? <Text style={styles.sourceCardSub}>{sub}</Text> : null}
        {meta ? <Text style={styles.sourceCardMeta}>{meta}</Text> : null}
      </View>
    </Pressable>
  );

  return (
    <Sheet
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      edge="end"
      size="lg"
      accent
      title={t('fill.title')}
      subtitle={
        step === 'source'
          ? t('fill.sourceSubtitle')
          : wantsHarvestLink
            ? t('fill.linkedSubtitle')
            : t('fill.unlinkedSubtitle')
      }
      icon={<Ionicons name="cube-outline" size={18} color={colors.primary} />}
      footer={footer}
    >
      <View style={styles.flow}>
        {withBulk.length === 0 ? (
          <Text style={styles.emptyBody}>{t('fill.noBulk')}</Text>
        ) : step === 'source' ? (
          <>
            <Text style={[styles.flowStep, styles.flowStepFirst]}>{t('fill.chooseSource')}</Text>
            {renderSourceCard(AUTO_SOURCE, 'business-outline', t('fill.autoTitle'), t('fill.autoBody'))}

            {linkedLots.length > 0 ? (
              <>
                <Text style={styles.flowStep}>{t('fill.fromHarvest')}</Text>
                <View style={styles.sourceList}>
                  {linkedLots.map((lot) => {
                    const where = fieldLabel(lot);
                    return renderSourceCard(
                      lot.id,
                      'leaf-outline',
                      formatLotDate(lot.pressedOn),
                      where,
                      `${t('fill.bulkChip', {
                        amount: formatOilNumber(lot.packing.bulkLitres, locale),
                      })} · ${t('fill.harvestLinked')}`
                    );
                  })}
                </View>
              </>
            ) : null}

            {unlinkedLots.length > 0 ? (
              <>
                <Text style={styles.flowStep}>{t('fill.otherLots')}</Text>
                <View style={styles.sourceList}>
                  {unlinkedLots.map((lot) => {
                    const where = fieldLabel(lot);
                    return renderSourceCard(
                      lot.id,
                      'cube-outline',
                      formatLotDate(lot.pressedOn),
                      where,
                      t('fill.bulkChip', {
                        amount: formatOilNumber(lot.packing.bulkLitres, locale),
                      })
                    );
                  })}
                </View>
              </>
            ) : null}
          </>
        ) : (
          <>
            {resolvedLot ? (
              <View style={[styles.sourceCard, styles.sourceCardSummary]}>
                <View style={styles.sourceCardIcon}>
                  <Ionicons
                    name={wantsHarvestLink ? 'leaf-outline' : 'business-outline'}
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.sourceCardBody}>
                  <Text style={styles.sourceCardTitle}>
                    {wantsHarvestLink ? formatLotDate(resolvedLot.pressedOn) : t('fill.autoTitle')}
                  </Text>
                  <Text style={styles.sourceCardSub}>
                    {wantsHarvestLink && fieldLabel(resolvedLot)
                      ? fieldLabel(resolvedLot)
                      : wantsHarvestLink
                        ? t('fill.harvestLinked')
                        : t('fill.autoBody')}
                  </Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.flowStep}>{t('fill.bulkAvailable')}</Text>
            <Text style={styles.flowQty}>{formatOilNumber(bulk, locale)} L</Text>

            <Text style={styles.flowStep}>{t('fill.what')}</Text>
            <View style={styles.stepper}>
              <View style={styles.stepperRow}>
                <Text style={styles.stepperLabel}>16 L</Text>
                <View style={styles.stepperControls}>
                  <Pressable
                    onPress={() => setAdd16((n) => Math.max(0, n - 1))}
                    disabled={add16 <= 0}
                    style={[styles.stepperBtn, add16 <= 0 && styles.stepperBtnDisabled]}
                  >
                    <Text style={styles.stepperValue}>−</Text>
                  </Pressable>
                  <Text style={styles.stepperValue}>{add16}</Text>
                  <Pressable
                    onPress={() => setAdd16((n) => n + 1)}
                    disabled={left - 16 < -0.05}
                    style={[styles.stepperBtn, left - 16 < -0.05 && styles.stepperBtnDisabled]}
                  >
                    <Text style={styles.stepperValue}>+</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.stepperRow}>
                <Text style={styles.stepperLabel}>17 L</Text>
                <View style={styles.stepperControls}>
                  <Pressable
                    onPress={() => setAdd17((n) => Math.max(0, n - 1))}
                    disabled={add17 <= 0}
                    style={[styles.stepperBtn, add17 <= 0 && styles.stepperBtnDisabled]}
                  >
                    <Text style={styles.stepperValue}>−</Text>
                  </Pressable>
                  <Text style={styles.stepperValue}>{add17}</Text>
                  <Pressable
                    onPress={() => setAdd17((n) => n + 1)}
                    disabled={left - 17 < -0.05}
                    style={[styles.stepperBtn, left - 17 < -0.05 && styles.stepperBtnDisabled]}
                  >
                    <Text style={styles.stepperValue}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <Text style={styles.flowTotal}>
              {t('fill.used', { amount: formatOilNumber(used, locale) })}
            </Text>
            <Text style={styles.flowHint}>
              {t('fill.left', { amount: formatOilNumber(Math.max(0, left), locale) })}
            </Text>
          </>
        )}
      </View>
    </Sheet>
  );
}

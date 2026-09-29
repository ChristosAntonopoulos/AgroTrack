import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Sheet from '../ui/Sheet';
import { useTheme } from '../../context/ThemeContext';
import { formatOilNumber, formatOilPack } from '../../myOil/formatOilPack';
import { groupLotsByField, poolHasOil, poolLabel, type FieldOilPool } from '../../myOil/fieldPools';
import { packHasType } from './OilOverviewSections';
import { OilSectionHeader } from './OilStockChrome';
import type { OilLot } from '../../services/oilStockService';
import type { PackFilter } from '../../myOil/commitmentCopy';
import type { RootStackParamList } from '../../navigation/types';
import type { PackLabels } from './types';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  lots: OilLot[];
  fieldNames: Record<string, string>;
  packLabels: PackLabels;
  packFilter?: PackFilter;
  busy: boolean;
  onFill: (pool: FieldOilPool) => void;
  onAdjust: (pool: FieldOilPool, kind: string) => void;
  preview?: boolean;
  onSeeAll?: () => void;
};

export function LotsTab({
  lots,
  fieldNames,
  packLabels,
  packFilter = 'all',
  busy,
  onFill,
  onAdjust,
  preview,
  onSeeAll,
}: Props) {
  const { t, i18n } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [detail, setDetail] = useState<FieldOilPool | null>(null);
  const locale = i18n.language;
  const unnamed = t('lots.noField');

  const pools = useMemo(() => {
    const grouped = groupLotsByField(lots).filter(poolHasOil);
    if (packFilter === 'all') return grouped;
    return grouped.filter((pool) =>
      packHasType(pool.packing, packFilter === 'bulk' ? 'bulk' : packFilter)
    );
  }, [lots, packFilter]);

  const shown = preview ? pools.slice(0, 3) : pools;

  if (pools.length === 0) {
    return (
      <View style={styles.panel}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t('lots.emptyTitle')}</Text>
          <Text style={styles.emptyBody}>{t('lots.emptyBody')}</Text>
          <Pressable
            onPress={() => navigation.navigate('HarvestCampaign')}
            style={[styles.btnPrimary, styles.btnSm, { marginTop: 12, alignSelf: 'flex-start' }]}
          >
            <Text style={styles.btnPrimaryText}>{t('lots.emptyCta')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      {preview ? (
        <OilSectionHeader titleKey="lots.previewTitle" icon="leaf-outline" />
      ) : (
        <OilSectionHeader titleKey="lots.title" icon="leaf-outline" />
      )}
      <View style={styles.lotList}>
        {shown.map((pool) => {
          const label = poolLabel(pool, fieldNames, unnamed);
          const free = formatOilNumber(pool.available.litres, locale);
          return (
            <Pressable
              key={pool.key}
              style={styles.lotCardCompact}
              onPress={() => setDetail(pool)}
            >
              <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <Text style={styles.lotWhen} numberOfLines={1}>
                  {label}
                </Text>
                <Text style={styles.lotTotal}>{t('lots.totalLitres', { amount: free })}</Text>
                <Text style={styles.lotPack} numberOfLines={1}>
                  {formatOilPack(pool.available, packLabels)}
                </Text>
                {pool.reserved.litres > 0.05 ? (
                  <Text style={styles.lotMeta}>
                    {t('warehouse.heldLitres', {
                      amount: formatOilNumber(pool.reserved.litres, locale),
                    })}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Pressable>
          );
        })}
      </View>
      {preview && onSeeAll ? (
        <Pressable style={styles.linkish} onPress={onSeeAll}>
          <Text style={styles.linkishText}>{t('lots.seeAll')}</Text>
        </Pressable>
      ) : null}

      {detail ? (
        <FieldPoolSheet
          open={!!detail}
          pool={detail}
          label={poolLabel(detail, fieldNames, unnamed)}
          packLabels={packLabels}
          busy={busy}
          onClose={() => setDetail(null)}
          onFill={() => {
            const pool = detail;
            setDetail(null);
            onFill(pool);
          }}
          onAdjust={(kind) => {
            const pool = detail;
            setDetail(null);
            onAdjust(pool, kind);
          }}
        />
      ) : null}
    </View>
  );
}

function FieldPoolSheet({
  open,
  pool,
  label,
  packLabels,
  busy,
  onClose,
  onFill,
  onAdjust,
}: {
  open: boolean;
  pool: FieldOilPool;
  label: string;
  packLabels: PackLabels;
  busy: boolean;
  onClose: () => void;
  onFill: () => void;
  onAdjust: (kind: string) => void;
}) {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const locale = i18n.language;
  const hasBulk = pool.available.bulkLitres > 0.05;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      edge="end"
      size="lg"
      accent
      title={label}
      subtitle={t('lots.totalLitres', {
        amount: formatOilNumber(pool.available.litres, locale),
      })}
      icon={<Ionicons name="leaf-outline" size={18} color={colors.primary} />}
      footer={
        <View style={styles.footerRow}>
          <Pressable onPress={onClose} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>{t('cancel')}</Text>
          </Pressable>
          {hasBulk ? (
            <Pressable disabled={busy} onPress={onFill} style={styles.btnPrimary}>
              <Text style={styles.btnPrimaryText}>{t('lots.fillTins')}</Text>
            </Pressable>
          ) : null}
        </View>
      }
    >
      <View style={styles.flow}>
        <Text style={[styles.flowStep, styles.flowStepFirst]}>{t('lots.detail.oil')}</Text>
        <Text style={styles.waitingPack}>
          {t('lots.detail.totalOil', {
            amount: formatOilNumber(pool.farmerLitres + pool.millKept, locale),
          })}
        </Text>
        {pool.millKept > 0.05 ? (
          <Text style={styles.waitingStory}>
            {t('lots.detail.millKept', { amount: formatOilNumber(pool.millKept, locale) })}
          </Text>
        ) : null}
        <Text style={styles.waitingStory}>
          {t('lots.detail.farmerTook', { amount: formatOilNumber(pool.farmerLitres, locale) })}
        </Text>

        <Text style={styles.flowStep}>{t('lots.detail.now')}</Text>
        <Text style={styles.waitingPack}>{formatOilPack(pool.available, packLabels)}</Text>

        {pool.reserved.litres > 0.05 ? (
          <>
            <Text style={styles.flowStep}>{t('lots.detail.gone')}</Text>
            <Text style={styles.waitingPack}>{formatOilPack(pool.reserved, packLabels)}</Text>
          </>
        ) : null}

        <View style={styles.lotDetailLinks}>
          <Pressable style={styles.linkish} onPress={() => onAdjust('correction')}>
            <Text style={styles.linkishText}>{t('lots.overflow.correct')}</Text>
          </Pressable>
          <Pressable style={styles.linkish} onPress={() => onAdjust('home_use')}>
            <Text style={styles.linkishText}>{t('lots.overflow.consume')}</Text>
          </Pressable>
        </View>
      </View>
    </Sheet>
  );
}

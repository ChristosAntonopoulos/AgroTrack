import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Sheet from '../ui/Sheet';
import { useTheme } from '../../context/ThemeContext';
import { formatOilNumber, formatOilPack } from '../../myOil/formatOilPack';
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
  formatDate: (iso: string) => string;
  onFill: (lot: OilLot) => void;
  onAdjust: (lot: OilLot, kind: string) => void;
  preview?: boolean;
  onSeeAll?: () => void;
};

export function LotsTab({
  lots,
  fieldNames,
  packLabels,
  packFilter = 'all',
  busy,
  formatDate,
  onFill,
  onAdjust,
  preview,
  onSeeAll,
}: Props) {
  const { t, i18n } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [detail, setDetail] = useState<OilLot | null>(null);
  const locale = i18n.language;

  const filtered = useMemo(() => {
    if (packFilter === 'all') return lots;
    return lots.filter((lot) =>
      packHasType(lot.packing, packFilter === 'bulk' ? 'bulk' : packFilter)
    );
  }, [lots, packFilter]);

  const shown = preview ? filtered.slice(0, 3) : filtered;

  if (lots.length === 0) {
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
        <OilSectionHeader titleKey="lots.previewTitle" icon="layers-outline" />
      ) : (
        <OilSectionHeader titleKey="lots.title" icon="layers-outline" />
      )}
      <View style={styles.lotList}>
        {shown.map((lot) => {
          const names = lot.fieldIds.map((id) => fieldNames[id]).filter(Boolean);
          const where = names[0] || null;
          const extra = names.length > 1 ? names.length - 1 : 0;
          const total = formatOilNumber(lot.packing.litres || lot.farmerLitres, locale);
          return (
            <Pressable
              key={lot.id}
              style={styles.lotCardCompact}
              onPress={() => setDetail(lot)}
            >
              <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <Text style={styles.lotWhen}>{formatDate(lot.pressedOn)}</Text>
                {where ? (
                  <Text style={styles.lotWhere} numberOfLines={1}>
                    {where}
                    {extra > 0 ? (
                      <Text style={styles.lotMore}> {t('lots.moreFields', { count: extra })}</Text>
                    ) : null}
                  </Text>
                ) : null}
                <Text style={styles.lotTotal}>{t('lots.totalLitres', { amount: total })}</Text>
                <Text style={styles.lotPack} numberOfLines={1}>
                  {formatOilPack(lot.packing, packLabels)}
                </Text>
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
        <LotDetailSheet
          open={!!detail}
          lot={detail}
          fieldNames={fieldNames}
          packLabels={packLabels}
          formatDate={formatDate}
          onClose={() => setDetail(null)}
          onFill={() => {
            const lot = detail;
            setDetail(null);
            onFill(lot);
          }}
          onAdjust={(kind) => {
            const lot = detail;
            setDetail(null);
            onAdjust(lot, kind);
          }}
        />
      ) : null}
    </View>
  );
}

function LotDetailSheet({
  open,
  lot,
  fieldNames,
  packLabels,
  formatDate,
  onClose,
  onFill,
  onAdjust,
}: {
  open: boolean;
  lot: OilLot;
  fieldNames: Record<string, string>;
  packLabels: PackLabels;
  formatDate: (iso: string) => string;
  onClose: () => void;
  onFill: () => void;
  onAdjust: (kind: string) => void;
}) {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const locale = i18n.language;
  const names = lot.fieldIds.map((id) => fieldNames[id]).filter(Boolean);
  const gone = lot.reserved;
  const hasBulk = lot.packing.bulkLitres > 0.05;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      edge="end"
      size="lg"
      accent
      title={formatDate(lot.pressedOn)}
      subtitle={names.length ? names.join(' · ') : undefined}
      icon={<Ionicons name="layers-outline" size={18} color={colors.primary} />}
      footer={
        <View style={styles.footerRow}>
          <Pressable onPress={onClose} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>{t('cancel')}</Text>
          </Pressable>
          {hasBulk ? (
            <Pressable onPress={onFill} style={styles.btnPrimary}>
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
            amount: formatOilNumber(lot.farmerLitres + (lot.millKept || 0), locale),
          })}
        </Text>
        {lot.millKept > 0 ? (
          <Text style={styles.waitingStory}>
            {t('lots.detail.millKept', { amount: formatOilNumber(lot.millKept, locale) })}
          </Text>
        ) : null}
        <Text style={styles.waitingStory}>
          {t('lots.detail.farmerTook', { amount: formatOilNumber(lot.farmerLitres, locale) })}
        </Text>

        <Text style={styles.flowStep}>{t('lots.detail.now')}</Text>
        <Text style={styles.waitingPack}>{formatOilPack(lot.packing, packLabels)}</Text>

        {gone.tin16 + gone.tin17 + gone.bulkLitres > 0.05 ? (
          <>
            <Text style={styles.flowStep}>{t('lots.detail.gone')}</Text>
            <Text style={styles.waitingPack}>{formatOilPack(gone, packLabels)}</Text>
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

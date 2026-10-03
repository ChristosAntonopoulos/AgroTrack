import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { formatOilNumber } from '../../myOil/formatOilPack';
import { groveShelfTitle, orderShelves, type GroveOilGroup } from '../../myOil/groupLotsByGrove';
import { packSegments, type PackSegment, type PackSegmentKey } from '../../myOil/stockPicture';
import { OilShelfBar } from './OilShelfBar';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  groups: GroveOilGroup[];
  fieldNames: Record<string, string>;
  focusFieldId?: string | null;
  onFillGrove?: (group: GroveOilGroup) => void;
};

const SEGMENT_LABEL: Record<PackSegmentKey, string> = {
  bulk: 'byGrove.packBulk',
  tin16: 'byGrove.pack16',
  tin17: 'byGrove.pack17',
};

/** One shelf, fully: name, pack mix, and the litres behind each colour. */
export function OilByGroveSection({ groups, fieldNames, focusFieldId, onFillGrove }: Props) {
  const { t, i18n } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const locale = i18n.language;
  const ordered = orderShelves(groups);
  if (ordered.length === 0) return null;

  const segmentColor: Record<PackSegmentKey, string> = {
    bulk: colors.primary,
    tin16: colors.accentGold,
    tin17: colors.warning,
  };

  const amountFor = (segment: PackSegment) => {
    if (segment.key === 'bulk') {
      return `${formatOilNumber(segment.litres, locale)} L`;
    }
    return t('byGrove.pieces', {
      count: segment.count,
      litres: formatOilNumber(segment.litres, locale),
    });
  };

  const pctLabel = (pct: number) =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(pct)}%`;

  return (
    <View style={{ gap: 10 }}>
      {ordered.map((group) => {
        const named = groveShelfTitle(group, fieldNames, {
          shared: t('byGrove.sharedTitle'),
          unassigned: t('byGrove.unassigned'),
        });
        const focused =
          !!focusFieldId &&
          (group.primaryFieldId === focusFieldId || group.fieldIds.includes(focusFieldId));
        const segments = packSegments(group.onHand);
        const onlyBulk = segments.length === 1 && segments[0].key === 'bulk';
        const canFill = (group.available.bulkLitres || 0) > 0.05 && !!onFillGrove;
        const headline = onlyBulk
          ? t('bulk', { amount: formatOilNumber(group.onHand.bulkLitres, locale) })
          : t('byGrove.totalLine', { amount: formatOilNumber(group.onHand.litres, locale) });
        const subtitle =
          named.subtitle ||
          (group.lots.length > 0 ? t('byGrove.lotCount', { count: group.lots.length }) : undefined);

        return (
          <View key={group.key} style={[styles.shelfDetail, focused && styles.groveCardFocus]}>
            <View style={styles.shelfCardTop}>
              <View style={styles.shelfIcon}>
                <Ionicons name="cube-outline" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.shelfName} numberOfLines={1}>
                  {named.title}
                </Text>
                {subtitle ? (
                  <Text style={styles.shelfSub} numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text style={styles.shelfHeadline}>{headline}</Text>
            <OilShelfBar segments={segments} colors={segmentColor} track={colors.surfaceMuted} />
            <View style={{ gap: 6 }}>
              {segments.map((segment) => (
                <View key={segment.key} style={styles.shelfSegRow}>
                  <View style={[styles.ringDot, { backgroundColor: segmentColor[segment.key] }]} />
                  <Text style={styles.shelfSegLabel}>{t(SEGMENT_LABEL[segment.key])}</Text>
                  <Text style={styles.shelfSegValue} numberOfLines={1}>
                    {amountFor(segment)}
                  </Text>
                  <Text style={styles.shelfSegPct}>{pctLabel(segment.pct)}</Text>
                </View>
              ))}
            </View>
            {focused && canFill ? (
              <Pressable onPress={() => onFillGrove?.(group)} style={styles.shelfFill}>
                <Text style={styles.shelfFillText}>{t('actions.fillTins')}</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { formatOilNumber, formatOilPack } from '../../myOil/formatOilPack';
import { groveShelfTitle, orderShelves, type GroveOilGroup } from '../../myOil/groupLotsByGrove';
import { packSegments, type PackSegmentKey } from '../../myOil/stockPicture';
import { OilShelfBar } from './OilShelfBar';
import type { PackLabels } from './types';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  groups: GroveOilGroup[];
  fieldNames: Record<string, string>;
  packLabels: PackLabels;
  onOpen: () => void;
  onOpenShelf: (group: GroveOilGroup) => void;
};

const PREVIEW = 4;

/** Shelf summary rows. The full detail, including edit, opens from a row or from All. */
export function OilShelfPreview({ groups, fieldNames, packLabels, onOpen, onOpenShelf }: Props) {
  const { t, i18n } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const ordered = orderShelves(groups);
  if (ordered.length === 0) return null;

  const segmentColor: Record<PackSegmentKey, string> = {
    bulk: colors.primary,
    tin16: colors.accentGold,
    tin17: colors.warning,
  };

  return (
    <View style={styles.stockPanel}>
      <View style={styles.shelfHead}>
        <Text style={styles.byGroveTitle}>{t('byGrove.title')}</Text>
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.shelfAll}
        >
          <Text style={styles.shelfAllText}>{t('byGrove.all')}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
        </Pressable>
      </View>
      {ordered.slice(0, PREVIEW).map((group, index) => {
        const { title } = groveShelfTitle(group, fieldNames, {
          shared: t('byGrove.sharedTitle'),
          unassigned: t('byGrove.unassigned'),
        });
        const segments = packSegments(group.onHand);
        return (
          <Pressable
            key={group.key}
            onPress={() => onOpenShelf(group)}
            accessibilityRole="button"
            style={({ pressed }) => [pressed && { opacity: 0.88 }]}
          >
            {index > 0 ? <View style={[styles.hairline, { marginBottom: 10 }]} /> : null}
            <View style={styles.shelfSummaryTop}>
              <Text style={[styles.shelfName, { flex: 1 }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.shelfLitres}>
                {formatOilNumber(group.onHand.litres, i18n.language)} L
              </Text>
            </View>
            <OilShelfBar segments={segments} colors={segmentColor} track={colors.surfaceElevated} />
            <Text style={styles.shelfPackLine} numberOfLines={2}>
              {formatOilPack(group.onHand, packLabels)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

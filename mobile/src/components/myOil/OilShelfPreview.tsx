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

const PREVIEW = 3;

/** The first shelves, enough to see where the oil sits. The rest opens on purpose. */
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
    <View style={{ gap: 8 }}>
      <View style={styles.shelfHead}>
        <Text style={styles.byGroveTitle}>{t('byGrove.title')}</Text>
        <Text style={styles.shelfHeadCount}>
          {t('byGrove.groveCount', { count: ordered.length })}
        </Text>
      </View>
      {ordered.slice(0, PREVIEW).map((group) => {
        const { title } = groveShelfTitle(group, fieldNames, {
          shared: t('byGrove.sharedTitle'),
          unassigned: t('byGrove.unassigned'),
        });
        const segments = packSegments(group.onHand);
        return (
          <Pressable
            key={group.key}
            onPress={() => onOpenShelf(group)}
            style={({ pressed }) => [styles.shelfCard, pressed && { opacity: 0.92 }]}
          >
            <View style={styles.shelfCardTop}>
              <Ionicons name="cube-outline" size={16} color={colors.primary} />
              <Text style={[styles.shelfName, { flex: 1 }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.shelfLitres}>
                {formatOilNumber(group.onHand.litres, i18n.language)} L
              </Text>
            </View>
            <OilShelfBar segments={segments} colors={segmentColor} track={colors.surfaceMuted} />
            <Text style={styles.shelfPackLine} numberOfLines={1}>
              {formatOilPack(group.onHand, packLabels)}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.shelfSeeAll, pressed && { opacity: 0.92 }]}
      >
        <Text style={styles.shelfSeeAllText}>{t('byGrove.seeAll')}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
      </Pressable>
    </View>
  );
}

import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { formatOilNumber, formatOilPack } from '../../myOil/formatOilPack';
import { groupMovementsByDay, movementActionKey } from '../../myOil/commitmentCopy';
import { OilSectionHeader } from './OilStockChrome';
import type { OilLot, StockMovement } from '../../services/oilStockService';
import type { PackLabels } from './types';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  movements: StockMovement[];
  lots: OilLot[];
  fieldNames: Record<string, string>;
  packLabels: PackLabels;
  preview?: boolean;
  onSeeAll?: () => void;
};

const ACTION_ICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  produced: 'leaf-outline',
  filledTins: 'cube-outline',
  held: 'hand-left-outline',
  holdCancelled: 'ban-outline',
  sold: 'water-outline',
  delivered: 'car-outline',
  homeUse: 'home-outline',
  gifted: 'gift-outline',
  consumed: 'water-outline',
  corrected: 'create-outline',
  other: 'pulse-outline',
};

export function MovementsTab({
  movements,
  lots,
  fieldNames,
  packLabels,
  preview,
  onSeeAll,
}: Props) {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);

  const filtered = useMemo(() => movements, [movements]);
  const shown = preview ? filtered.slice(0, 3) : filtered;

  const groups = useMemo(
    () =>
      groupMovementsByDay(shown, i18n.language, {
        today: t('common:today', { defaultValue: 'Today' }),
        yesterday: t('common:yesterday', { defaultValue: 'Yesterday' }),
      }),
    [shown, i18n.language, t]
  );

  if (movements.length === 0) {
    return (
      <View style={styles.panel}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t('recent.emptyTitle')}</Text>
          <Text style={styles.emptyBody}>{t('recent.emptyBody')}</Text>
        </View>
      </View>
    );
  }

  const detailFor = (m: StockMovement) => {
    const action = movementActionKey(m.kind);
    if (action === 'produced') {
      const lot = lots.find((l) => l.id === m.oilLotId);
      const where = lot?.fieldIds.map((id) => fieldNames[id]).filter(Boolean).join(' · ');
      return where || undefined;
    }
    if (action === 'filledTins') {
      const tins = Math.abs(m.packDelta.tin16) + Math.abs(m.packDelta.tin17);
      const bulk = Math.abs(m.packDelta.bulkLitres);
      if (tins > 0) {
        return t('timeline.bulkToTins', {
          bulk: `${formatOilNumber(bulk || tins * 16, i18n.language)} L`,
          tins,
        });
      }
    }
    if (m.notes && !/oil lot|created|batch|allocation/i.test(m.notes)) return m.notes;
    return undefined;
  };

  return (
    <View>
      <OilSectionHeader titleKey="recent.title" icon="pulse-outline" />
      <View style={styles.timeline}>
        {groups.map((g) => (
          <View key={g.dayKey} style={styles.timelineDay}>
            <Text style={styles.timelineLabel}>{g.label}</Text>
            {g.items.map((m, idx) => {
              const action = movementActionKey(m.kind);
              const icon = ACTION_ICON[action] ?? 'pulse-outline';
              const packAbs = {
                tin16: Math.abs(m.packDelta.tin16),
                tin17: Math.abs(m.packDelta.tin17),
                bulkLitres: Math.abs(m.packDelta.bulkLitres),
                litres: Math.abs(m.litresDelta),
              };
              const detail = detailFor(m);
              const hasDelta = Math.abs(m.litresDelta) > 0.05;
              const positive = m.litresDelta > 0;
              const delta = hasDelta
                ? `${positive ? '+' : '−'}${formatOilNumber(Math.abs(m.litresDelta), i18n.language)} L`
                : null;
              return (
                <View
                  key={m.id}
                  style={[styles.timelineItem, idx === 0 && styles.timelineItemFirst]}
                >
                  <View style={styles.timelineBadge} accessibilityElementsHidden>
                    <Ionicons name={icon} size={15} color={colors.primary} />
                  </View>
                  <View style={styles.timelineBody}>
                    <View style={styles.timelineRow}>
                      <Text style={styles.timelineAction}>{t(`timeline.${action}`)}</Text>
                      {delta ? (
                        <Text style={positive ? styles.timelineDeltaPlus : styles.timelineDeltaMinus}>
                          {delta}
                        </Text>
                      ) : null}
                    </View>
                    {packAbs.tin16 + packAbs.tin17 + packAbs.bulkLitres > 0.05 ? (
                      <Text style={styles.timelineDetail}>
                        {formatOilPack(packAbs, packLabels)}
                      </Text>
                    ) : null}
                    {detail ? <Text style={styles.timelineDetail}>{detail}</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>
      {preview && onSeeAll ? (
        <Pressable style={styles.linkish} onPress={onSeeAll}>
          <Text style={styles.linkishText}>{t('recent.seeAll')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

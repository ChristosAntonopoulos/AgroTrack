import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { formatOilNumber, formatOilPack } from '../../myOil/formatOilPack';
import { groveGroupLabel, type GroveOilGroup } from '../../myOil/groupLotsByGrove';
import { createMyOilStyles } from './myOilStyles';
import type { PackLabels } from './types';

type Props = {
  groups: GroveOilGroup[];
  fieldNames: Record<string, string>;
  packLabels: PackLabels;
  focusFieldId?: string | null;
  onSelectGrove?: (group: GroveOilGroup) => void;
};

export function OilByGroveSection({
  groups,
  fieldNames,
  packLabels,
  focusFieldId,
  onSelectGrove,
}: Props) {
  const { t, i18n } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  if (groups.length === 0) return null;

  return (
    <View style={styles.byGrove}>
      <Text style={styles.byGroveTitle}>{t('byGrove.title')}</Text>
      <Text style={styles.sectionHint}>{t('byGrove.hint')}</Text>
      {groups.map((group) => {
        const label = groveGroupLabel(group, fieldNames, {
          shared: (names) => t('byGrove.shared', { names }),
          unassigned: t('byGrove.unassigned'),
        });
        const focused =
          !!focusFieldId &&
          (group.primaryFieldId === focusFieldId || group.fieldIds.includes(focusFieldId));
        const free = group.available.litres;
        return (
          <Pressable
            key={group.key}
            onPress={() => onSelectGrove?.(group)}
            style={[styles.groveCard, focused && styles.groveCardFocus]}
          >
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.groveTitle}>{label}</Text>
              <Text style={styles.grovePack}>
                {free > 0.05 ? formatOilPack(group.available, packLabels) : t('byGrove.noneFree')}
              </Text>
              <Text style={styles.groveMeta}>
                {t('byGrove.lotCount', { count: group.lots.length })}
                {free > 0.05
                  ? ` · ${t('litres', { amount: formatOilNumber(free, i18n.language) })}`
                  : ''}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

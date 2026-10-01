import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { OilStockTab } from '../../myOil/commitmentCopy';
import { createMyOilStyles } from './myOilStyles';

const TABS: { id: OilStockTab; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'stock', icon: 'business-outline' },
  { id: 'holds', icon: 'bookmark-outline' },
  { id: 'movements', icon: 'pulse-outline' },
];

type Props = {
  active: OilStockTab;
  onChange: (tab: OilStockTab) => void;
  /** Number badge per tab, e.g. open holds. */
  counts?: Partial<Record<OilStockTab, number>>;
};

export function OilStockTabs({ active, onChange, counts }: Props) {
  const { t } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);

  return (
    <View style={styles.tabsSticky} accessibilityRole="tablist" accessibilityLabel={t('title')}>
      <View style={styles.tabs}>
        {TABS.map(({ id, icon }) => {
          const on = active === id;
          const count = counts?.[id] || 0;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(id)}
              style={[styles.tabBtn, styles.tabBtnRow, on && styles.tabBtnOn]}
            >
              <Ionicons
                name={icon}
                size={14}
                color={on ? colors.textPrimary : colors.textSecondary}
              />
              <Text style={[styles.tabLabel, on && styles.tabLabelOn]} numberOfLines={1}>
                {t(`tabs.${id}`)}
              </Text>
              {count > 0 ? (
                <View style={styles.tabCount}>
                  <Text style={styles.tabCountText}>{count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

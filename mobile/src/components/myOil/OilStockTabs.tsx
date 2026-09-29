import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { OilStockTab } from '../../myOil/commitmentCopy';
import { createMyOilStyles } from './myOilStyles';

const TABS: OilStockTab[] = ['overview', 'stock', 'others', 'lots'];

type Props = {
  active: OilStockTab;
  onChange: (tab: OilStockTab) => void;
};

export function OilStockTabs({ active, onChange }: Props) {
  const { t } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);

  return (
    <View style={styles.tabsSticky} accessibilityRole="tablist" accessibilityLabel={t('title')}>
      <View style={styles.tabs}>
        {TABS.map((id) => {
          const on = active === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(id)}
              style={[styles.tabBtn, on && styles.tabBtnOn]}
            >
              <Text style={[styles.tabLabel, on && styles.tabLabelOn]} numberOfLines={1}>
                {t(`tabs.${id}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

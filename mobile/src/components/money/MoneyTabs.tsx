import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { createElevation, radii } from '../../theme';

export type MoneyPageTab = 'overview' | 'entries';

const TABS: { id: MoneyPageTab; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'overview', icon: 'leaf-outline' },
  { id: 'entries', icon: 'list-outline' },
];

type Props = {
  active: MoneyPageTab;
  onChange: (tab: MoneyPageTab) => void;
  entryCount?: number;
};

/** Two doors, same shape as the warehouse tabs. */
const MoneyTabs: React.FC<Props> = ({ active, onChange, entryCount = 0 }) => {
  const { t } = useTranslation('money');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();

  return (
    <View style={styles.tabs} accessibilityRole="tablist" accessibilityLabel={t('title')}>
      {TABS.map(({ id, icon }) => {
        const on = active === id;
        const count = id === 'entries' ? entryCount : 0;
        return (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(id)}
            style={[
              styles.tab,
              { minHeight: Math.min(tapMin, 44) },
              on && {
                backgroundColor: colors.surface,
                borderColor: colors.oliveBorder,
                ...createElevation(colors, 'sm'),
              },
            ]}
          >
            <Ionicons name={icon} size={15} color={on ? colors.textPrimary : colors.textSecondary} />
            <Text
              style={{
                fontSize: 13 * fontScaleMultiplier,
                fontWeight: on ? '700' : '600',
                color: on ? colors.textPrimary : colors.textSecondary,
              }}
              numberOfLines={1}
            >
              {t(`tabs.${id}`)}
            </Text>
            {count > 0 ? (
              <View style={[styles.count, { backgroundColor: colors.primaryLight }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  count: {
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.full,
    alignItems: 'center',
  },
});

export default MoneyTabs;

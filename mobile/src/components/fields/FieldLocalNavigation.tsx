import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme';

export type FieldTab = 'vegetation' | 'weather' | 'details';

export const FIELD_PAGE_TABS: FieldTab[] = ['vegetation', 'weather', 'details'];

type Props = {
  tab: FieldTab;
  onTabChange: (tab: FieldTab) => void;
  tabs?: FieldTab[];
};

/** Segmented field tabs — vegetation, weather, details. */
const FieldLocalNavigation: React.FC<Props> = ({ tab, onTabChange, tabs = FIELD_PAGE_TABS }) => {
  const { t } = useTranslation('fields');
  const { colors, tapMin } = useTheme();

  const labels: Record<FieldTab, string> = {
    vegetation: t('page.tabVegetation'),
    weather: t('page.tabWeather'),
    details: t('page.tabDetails', { defaultValue: t('page.details') }),
  };

  const titles: Record<FieldTab, string> = {
    vegetation: t('page.tabVegetation'),
    weather: t('page.tabWeather'),
    details: t('page.details'),
  };

  return (
    <View style={styles.outer}>
      <View
        style={[
          styles.wrap,
          {
            borderColor: colors.borderLight,
            backgroundColor: colors.surfaceElevated || colors.surface,
          },
        ]}
        accessibilityRole="tablist"
        accessibilityLabel={t('page.tabsAria')}
      >
        {tabs.map((id) => {
          const selected = tab === id;
          return (
            <Pressable
              key={id}
              onPress={() => onTabChange(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={titles[id]}
              style={[
                styles.tab,
                {
                  minHeight: Math.max(44, Math.min(tapMin, 48)),
                  backgroundColor: selected ? colors.primary : 'transparent',
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  {
                    color: selected ? '#fff' : colors.textSecondary,
                    fontWeight: selected ? '800' : '700',
                  },
                ]}
              >
                {labels[id]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  wrap: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    borderRadius: 9,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    textAlign: 'center',
  },
});

export default FieldLocalNavigation;

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography } from '../../theme';

export type FieldTab = 'overview' | 'map' | 'chronologio' | 'details';

export const FIELD_PAGE_TABS: FieldTab[] = ['overview', 'map', 'chronologio', 'details'];

type Props = {
  tab: FieldTab;
  onTabChange: (tab: FieldTab) => void;
};

const FieldLocalNavigation: React.FC<Props> = ({ tab, onTabChange }) => {
  const { t } = useTranslation('fields');
  const { colors, tapMin } = useTheme();

  const labels: Record<FieldTab, string> = {
    overview: t('detail.overview'),
    map: t('page.mapData'),
    chronologio: t('detail.timeline'),
    details: t('page.details'),
  };

  return (
    <View style={[styles.wrap, { borderBottomColor: colors.borderLight }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="tablist"
        accessibilityLabel={t('page.tabsAria')}
      >
        {FIELD_PAGE_TABS.map((id) => {
          const selected = tab === id;
          return (
            <Pressable
              key={id}
              onPress={() => onTabChange(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[
                styles.tab,
                {
                  minHeight: Math.max(tapMin, 48),
                  borderBottomColor: selected ? colors.primary : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.label,
                  {
                    fontWeight: selected ? '700' : '600',
                    color: selected ? colors.textPrimary : colors.textSecondary,
                  },
                ]}
              >
                {labels[id]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    gap: 4,
    paddingHorizontal: spacing.base,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingBottom: 10,
    borderBottomWidth: 3,
    justifyContent: 'center',
  },
  label: {
    ...typography.styles.body,
    fontSize: 16,
  },
});

export default FieldLocalNavigation;

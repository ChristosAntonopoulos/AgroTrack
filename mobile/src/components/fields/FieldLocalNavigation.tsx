import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { createElevation, radii, spacing } from '../../theme';

export type FieldTab = 'field' | 'weather' | 'details';

export const FIELD_PAGE_TABS: FieldTab[] = ['field', 'weather', 'details'];

const TAB_ICONS: Record<FieldTab, React.ComponentProps<typeof Ionicons>['name']> = {
  field: 'map-outline',
  weather: 'partly-sunny-outline',
  details: 'document-text-outline',
};

type Props = {
  tab: FieldTab;
  onTabChange: (tab: FieldTab) => void;
  tabs?: FieldTab[];
};

/** Αποθήκη-style pill tabs for the field page. */
const FieldLocalNavigation: React.FC<Props> = ({ tab, onTabChange, tabs = FIELD_PAGE_TABS }) => {
  const { t } = useTranslation('fields');
  const { colors, tapMin } = useTheme();

  const labels: Record<FieldTab, string> = {
    field: t('page.tabField', { defaultValue: t('page.mapData') }),
    weather: t('page.tabWeatherVegetation', {
      defaultValue: `${t('page.tabWeather')} & ${t('page.tabVegetation')}`,
    }),
    details: t('page.tabDetails', { defaultValue: t('page.details') }),
  };

  return (
    <View style={styles.outer} accessibilityLabel={t('page.tabsAria')}>
      <View style={styles.row}>
        {tabs.map((id) => {
          const on = tab === id;
          return (
            <Pressable
              key={id}
              onPress={() => onTabChange(id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={labels[id]}
              style={[
                styles.tab,
                {
                  minHeight: Math.min(tapMin, 40),
                  borderColor: on ? colors.oliveBorder : 'transparent',
                  backgroundColor: on ? colors.surface : 'transparent',
                },
                on ? createElevation(colors, 'sm') : null,
              ]}
            >
              <Ionicons
                name={TAB_ICONS[id]}
                size={14}
                color={on ? colors.textPrimary : colors.textSecondary}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  { color: on ? colors.textPrimary : colors.textSecondary, fontWeight: on ? '700' : '600' },
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
  row: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 12.5,
    textAlign: 'center',
    flexShrink: 1,
  },
});

export default FieldLocalNavigation;

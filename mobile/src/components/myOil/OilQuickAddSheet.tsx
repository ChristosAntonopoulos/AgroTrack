import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import Sheet from '../ui/Sheet';

type Props = {
  open: boolean;
  onClose: () => void;
  onSell: () => void;
  onGive: () => void;
  onHold: () => void;
  onFill: () => void;
  onAllRecords: () => void;
};

type Action = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
};

/** Storage + menu: four cellar verbs, then the full capture catalog. */
export function OilQuickAddSheet({
  open,
  onClose,
  onSell,
  onGive,
  onHold,
  onFill,
  onAllRecords,
}: Props) {
  const { t } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();

  const actions: Action[] = [
    { key: 'sell', label: t('actions.sell'), icon: 'cash-outline', onPress: onSell },
    { key: 'give', label: t('actions.verbGive'), icon: 'water-outline', onPress: onGive },
    { key: 'hold', label: t('actions.hold'), icon: 'bookmark-outline', onPress: onHold },
    { key: 'fill', label: t('actions.fillVerb'), icon: 'cube-outline', onPress: onFill },
  ];

  const tile = (action: Action) => (
    <Pressable
      key={action.key}
      accessibilityRole="button"
      onPress={action.onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          minHeight: Math.max(tapMin, 64),
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceElevated,
          paddingHorizontal: 12,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <Ionicons name={action.icon} size={18} color={colors.primary} />
      <Text
        style={{ flex: 1, color: colors.textPrimary, fontSize: 15, fontWeight: '700' }}
        numberOfLines={2}
      >
        {action.label}
      </Text>
    </Pressable>
  );

  return (
    <Sheet open={open} onClose={onClose} edge="bottom" size="sm" title={t('actions.quickTitle')}>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {actions.slice(0, 2).map(tile)}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {actions.slice(2).map(tile)}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onAllRecords}
          style={({ pressed }) => [
            {
              minHeight: tapMin,
              marginTop: 4,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '600' }}>
            {t('actions.allRecords')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </Pressable>
      </View>
    </Sheet>
  );
}

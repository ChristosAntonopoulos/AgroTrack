import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { createMyOilStyles } from './myOilStyles';

type Door = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  detail?: string;
  badge?: number;
  onPress: () => void;
};

type Props = {
  attentionCount: number;
  shelvesCount: number;
  waitingCount: number;
  onAttention: () => void;
  onShelves: () => void;
  onWaiting: () => void;
  onActivity: () => void;
};

/** Inventory-style doors off the floor — one tap, no nested lists. */
export function OilFloorDoors({
  attentionCount,
  shelvesCount,
  waitingCount,
  onAttention,
  onShelves,
  onWaiting,
  onActivity,
}: Props) {
  const { t } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);

  const doors: Door[] = [
    ...(attentionCount > 0
      ? [
          {
            id: 'attention',
            icon: 'alert-circle-outline' as const,
            title: t('attention.door'),
            detail: t('attention.doorDetail', { count: attentionCount }),
            badge: attentionCount,
            onPress: onAttention,
          },
        ]
      : []),
    {
      id: 'shelves',
      icon: 'layers-outline',
      title: t('doors.shelves'),
      detail: t('doors.shelvesDetail', { count: shelvesCount }),
      onPress: onShelves,
    },
    {
      id: 'waiting',
      icon: 'bookmark-outline',
      title: t('doors.waiting'),
      detail:
        waitingCount > 0
          ? t('doors.waitingDetail', { count: waitingCount })
          : t('doors.waitingEmpty'),
      badge: waitingCount > 0 ? waitingCount : undefined,
      onPress: onWaiting,
    },
    {
      id: 'activity',
      icon: 'time-outline',
      title: t('doors.activity'),
      detail: t('doors.activityDetail'),
      onPress: onActivity,
    },
  ];

  return (
    <View style={styles.floorDoors}>
      {doors.map((door) => (
        <Pressable
          key={door.id}
          onPress={door.onPress}
          style={({ pressed }) => [
            styles.floorDoor,
            { minHeight: Math.max(56, tapMin) },
            pressed && { opacity: 0.92 },
            door.id === 'attention' && styles.floorDoorAlert,
          ]}
        >
          <View style={styles.floorDoorIcon}>
            <Ionicons
              name={door.icon}
              size={20}
              color={door.id === 'attention' ? colors.accentGold : colors.primary}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.floorDoorTitle}>{door.title}</Text>
            {door.detail ? (
              <Text style={styles.floorDoorDetail} numberOfLines={1}>
                {door.detail}
              </Text>
            ) : null}
          </View>
          {door.badge ? (
            <View style={styles.floorDoorBadge}>
              <Text style={styles.floorDoorBadgeText}>{door.badge}</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Pressable>
      ))}
    </View>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { useTasks } from '../hooks/useTasks';
import { useFamilyMembershipModules } from '../hooks/useFamilyMembershipModules';
import { isTaskOverdue } from '../utils/taskListUtils';
import { createElevation, radii, typography, motion } from '../theme';
import { getDockMetrics } from './dockMetrics';
import type { RootStackParamList } from './types';
import {
  captureContextForRoute,
  dockTabForRoute,
  type DockTab,
  type FocusedRoute,
} from './dockRoute';
import { useOwnerActivationOptional } from '../onboarding/OwnerActivationContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = {
  route: FocusedRoute;
};

const TabIcon = ({
  name,
  focused,
  color,
  pillColor,
}: {
  name: IconName;
  focused: boolean;
  color: string;
  pillColor: string;
}) => (
  <View
    style={[
      styles.iconWrap,
      focused ? { backgroundColor: pillColor } : null,
    ]}
  >
    <Ionicons name={name} size={22} color={color} />
  </View>
);

/**
 * Persistent bottom dock. Lives above the root stack so Chronologio, Fields,
 * Record, Tasks, and More stay reachable on field, money, and other pages.
 */
const AppDock: React.FC<Props> = ({ route }) => {
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const capture = useCaptureOptional();
  const familyModules = useFamilyMembershipModules();
  const activation = useOwnerActivationOptional();
  const { t } = useTranslation('nav');
  const { tasks } = useTasks();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const taskBadgeCount = useMemo(
    () => safeTasks.filter(tk => isTaskOverdue(tk)).length,
    [safeTasks]
  );

  const showFields = familyModules === null || Boolean(familyModules.has('fields'));
  const showTasks = familyModules === null || Boolean(familyModules.has('tasks'));
  const active = dockTabForRoute(route.name);
  const labelSize = Math.max(9, Math.round(10 * fontScaleMultiplier));
  const metrics = getDockMetrics(tapMin, insets.bottom);
  const { bottomInset, dockMargin, dockPadBottom, contentHeight, dockHeight, fabSize } = metrics;

  // Hard lock until όρια — hide dock so growers can't bounce through Chronologio/Tasks.
  if (activation?.locked) return null;
  if (keyboardOpen) return null;

  const openTab = (screen: DockTab) => {
    if (screen === 'Fields') {
      navigation.navigate('Main', { screen: 'Fields', params: { screen: 'FieldsHome' } });
      return;
    }
    navigation.navigate('Main', { screen });
  };

  const tint = (tab: DockTab) =>
    active === tab ? colors.tabBarForeground : colors.tabBarForegroundInactive;

  const item = (
    tab: DockTab,
    label: string,
    icon: IconName,
    badge?: string
  ) => (
    <Pressable
      key={tab}
      accessibilityRole="button"
      accessibilityState={{ selected: active === tab }}
      accessibilityLabel={label}
      onPress={() => openTab(tab)}
      style={[styles.item, { minHeight: contentHeight }]}
    >
      <TabIcon
        name={icon}
        focused={active === tab}
        color={tint(tab)}
        pillColor={colors.tabBarActivePill}
      />
      <Text
        style={[
          styles.label,
          {
            color: tint(tab),
            fontSize: labelSize,
            fontWeight: active === tab ? '700' : '600',
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: colors.error }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );

  const taskBadge =
    showTasks && taskBadgeCount > 0
      ? taskBadgeCount > 99
        ? '99+'
        : String(taskBadgeCount)
      : undefined;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: bottomInset, left: dockMargin, right: dockMargin }]}
    >
      <View
        style={[
          styles.dock,
          {
            backgroundColor: colors.tabBarBackground,
            borderColor: colors.borderLight,
            height: dockHeight,
            paddingBottom: dockPadBottom,
            borderRadius: radii.dock ?? 22,
            ...createElevation(colors, 'floating'),
          },
        ]}
      >
        {item('ChronologioTab', t('chronologio'), 'time-outline')}
        {showFields ? item('Fields', t('fields'), 'leaf-outline') : <View style={styles.item} />}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('capture', { defaultValue: 'Record' })}
          onPress={() => capture?.openCapture(captureContextForRoute(route))}
          style={({ pressed }) => [
            styles.fabHit,
            { minHeight: contentHeight, transform: [{ scale: pressed ? motion.fabPressScale : 1 }] },
          ]}
        >
          <View
            style={[
              styles.fab,
              {
                width: fabSize,
                height: fabSize,
                backgroundColor: colors.primary,
                borderColor: colors.tabBarBackground,
                ...createElevation(colors, 'md'),
              },
            ]}
          >
            <Ionicons name="add" size={28} color={colors.onOlive} />
          </View>
        </Pressable>
        {showTasks
          ? item('Tasks', t('tasks'), 'checkbox-outline', taskBadge)
          : <View style={styles.item} />}
        {item('More', t('more'), 'ellipsis-horizontal-circle-outline')}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    zIndex: 40,
    elevation: 24,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 52,
    height: 28,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.styles.caption,
    letterSpacing: 0.1,
    marginTop: 2,
  },
  fabHit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    borderWidth: 3,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 12,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default AppDock;

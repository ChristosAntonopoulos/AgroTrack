import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FieldsStack from './FieldsStack';
import TaskListScreen from '../screens/TaskListScreen';
import MoreScreen from '../screens/MoreScreen';
import ChronologioScreen from '../screens/ChronologioScreen';
import { MainTabParamList } from './types';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { useTasks } from '../hooks/useTasks';
import { useFamilyMembershipModules } from '../hooks/useFamilyMembershipModules';
import { isTaskOverdue } from '../utils/taskListUtils';
import { typography, createElevation, radii, motion } from '../theme';
import { getDockMetrics } from './dockMetrics';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = React.ComponentProps<typeof Ionicons>['name'];

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
      focused
        ? {
            backgroundColor: pillColor,
            borderRadius: radii.full,
            paddingHorizontal: 12,
            paddingVertical: 4,
          }
        : null,
    ]}
  >
    <Ionicons name={name} size={focused ? 22 : 21} color={color} />
  </View>
);

const CapturePlaceholder = () => <View />;

/**
 * Bottom dock — hooks stay unconditional and in a fixed order
 * so Fast Refresh / remounts never trip Rules of Hooks.
 */
const MainTabs = () => {
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const { defaultView } = usePreferences();
  const capture = useCaptureOptional();
  const familyModules = useFamilyMembershipModules();
  const { t } = useTranslation('nav');
  const { tasks } = useTasks();
  const insets = useSafeAreaInsets();

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const taskBadgeCount = useMemo(
    () => safeTasks.filter(tk => isTaskOverdue(tk)).length,
    [safeTasks]
  );

  const showFields = familyModules === null || Boolean(familyModules.has('fields'));
  const showTasks = familyModules === null || Boolean(familyModules.has('tasks'));

  const labelSize = Math.max(9, Math.round(10 * fontScaleMultiplier));
  const metrics = getDockMetrics(tapMin, insets.bottom);
  const { bottomInset, dockMargin, dockPadBottom, contentHeight, dockHeight, fabSize } = metrics;

  const startMap = {
    fields: showFields ? 'Fields' : 'ChronologioTab',
    chronologio: 'ChronologioTab',
  } as const;
  const initialRouteName = startMap[defaultView] ?? 'ChronologioTab';

  return (
    <Tab.Navigator
      key="main-tabs-v2"
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: colors.tabBarForeground,
        tabBarInactiveTintColor: colors.tabBarForegroundInactive,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: 'absolute',
          left: dockMargin,
          right: dockMargin,
          bottom: bottomInset,
          backgroundColor: colors.tabBarBackground,
          borderTopWidth: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.borderLight,
          borderRadius: radii.dock ?? 22,
          paddingTop: 8,
          paddingBottom: dockPadBottom,
          height: dockHeight,
          ...createElevation(colors, 'floating'),
        },
        tabBarLabelStyle: {
          ...typography.styles.caption,
          fontSize: labelSize,
          fontWeight: '600',
          letterSpacing: 0.1,
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          minHeight: contentHeight,
          paddingVertical: 0,
          flex: 1,
        },
      }}
    >
      <Tab.Screen
        name="ChronologioTab"
        component={ChronologioScreen}
        options={{
          tabBarLabel: t('chronologio'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'time' : 'time-outline'}
              focused={focused}
              color={color}
              pillColor={colors.tabBarActivePill}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Fields"
        component={FieldsStack}
        options={{
          tabBarLabel: t('fields'),
          tabBarButton: showFields ? undefined : () => null,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'leaf' : 'leaf-outline'}
              focused={focused}
              color={color}
              pillColor={colors.tabBarActivePill}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Capture"
        component={CapturePlaceholder}
        listeners={{
          tabPress: e => {
            e.preventDefault();
            capture?.openCapture();
          },
        }}
        options={{
          tabBarLabel: () => null,
          tabBarButton: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Capture"
              onPress={() => capture?.openCapture()}
              style={({ pressed }) => [
                styles.fabHit,
                { transform: [{ scale: pressed ? motion.fabPressScale : 1 }] },
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
          ),
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TaskListScreen}
        options={{
          tabBarLabel: t('tasks'),
          tabBarButton: showTasks ? undefined : () => null,
          tabBarBadge:
            showTasks && taskBadgeCount > 0
              ? taskBadgeCount > 99
                ? '99+'
                : String(taskBadgeCount)
              : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.error,
            fontSize: 10,
            fontWeight: '700',
          },
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'checkbox' : 'checkbox-outline'}
              focused={focused}
              color={color}
              pillColor={colors.tabBarActivePill}
            />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarLabel: t('more'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal-circle-outline'}
              focused={focused}
              color={color}
              pillColor={colors.tabBarActivePill}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
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
});

export default MainTabs;

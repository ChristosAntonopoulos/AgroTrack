import React, { useMemo } from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DashboardScreen from '../screens/DashboardScreen';
import CalendarScreen from '../screens/CalendarScreen';
import FieldsListScreen from '../screens/FieldsListScreen';
import TaskListScreen from '../screens/TaskListScreen';
import MoreScreen from '../screens/MoreScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ChronologioScreen from '../screens/ChronologioScreen';
import { MainTabParamList } from './types';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { useMoreMenuOptional } from '../context/MoreMenuContext';
import { useTasks } from '../hooks/useTasks';
import { isTaskOverdue } from '../utils/taskListUtils';
import { typography, spacing, createElevation } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TabIcon = ({
  name,
  focused,
  color,
  pillColor,
  tapMin,
}: {
  name: IconName;
  focused: boolean;
  color: string;
  pillColor: string;
  tapMin: number;
}) => (
  <View
    style={[
      styles.iconWrap,
      { minHeight: Math.max(32, tapMin * 0.7), minWidth: Math.max(32, tapMin * 0.7) },
      focused && {
        backgroundColor: pillColor,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 5,
      },
    ]}
  >
    <Ionicons name={name} size={22} color={color} />
  </View>
);

const hiddenTabOptions = {
  tabBarButton: () => null as unknown as React.ReactElement,
  tabBarItemStyle: { display: 'none' as const },
};

const CapturePlaceholder = () => <View />;

const MainTabs = () => {
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const { defaultView } = usePreferences();
  const capture = useCaptureOptional();
  const moreMenu = useMoreMenuOptional();
  const { t } = useTranslation('nav');
  const { tasks } = useTasks();
  const insets = useSafeAreaInsets();

  const taskBadgeCount = useMemo(
    () => tasks.filter(tk => isTaskOverdue(tk)).length,
    [tasks]
  );

  const labelSize = Math.max(11, Math.round(11 * fontScaleMultiplier));
  const tabBarHeight =
    Math.max(60, tapMin + 16) + Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 4);

  const startMap = {
    today: 'ChronologioTab',
    dashboard: 'ChronologioTab',
    fields: 'Fields',
    chronologio: 'ChronologioTab',
  } as const;
  const initialRouteName = startMap[defaultView] ?? 'ChronologioTab';

  return (
    <Tab.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabBarForeground,
        tabBarInactiveTintColor: colors.tabBarForegroundInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          paddingTop: spacing.xs,
          paddingBottom: Math.max(insets.bottom, spacing.xs),
          height: tabBarHeight,
          ...createElevation(colors, 'sm'),
        },
        tabBarLabelStyle: {
          ...typography.styles.caption,
          fontSize: labelSize,
          fontWeight: '600',
          marginTop: 0,
        },
        tabBarItemStyle: {
          minHeight: tapMin,
          paddingVertical: 2,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: t('dashboard'), ...hiddenTabOptions }}
      />
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
              tapMin={tapMin}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Fields"
        component={FieldsListScreen}
        options={{
          tabBarLabel: t('fields'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'leaf' : 'leaf-outline'}
              focused={focused}
              color={color}
              pillColor={colors.tabBarActivePill}
              tapMin={tapMin}
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
          tabBarIcon: () => (
            <View
              style={{
                width: Math.max(52, tapMin),
                height: Math.max(52, tapMin),
                borderRadius: 999,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
                ...createElevation(colors, 'md'),
              }}
            >
              <Ionicons name="add" size={28} color={colors.onOlive} />
            </View>
          ),
          tabBarButton: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Capture"
              onPress={() => capture?.openCapture()}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <View
                style={{
                  width: Math.max(52, tapMin),
                  height: Math.max(52, tapMin),
                  borderRadius: 999,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                  ...createElevation(colors, 'md'),
                }}
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
          tabBarBadge:
            taskBadgeCount > 0
              ? taskBadgeCount > 99
                ? '99+'
                : String(taskBadgeCount)
              : undefined,
          ...hiddenTabOptions,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ tabBarLabel: t('calendar'), ...hiddenTabOptions }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        listeners={{
          tabPress: e => {
            e.preventDefault();
            moreMenu?.openMore();
          },
        }}
        options={{
          tabBarLabel: t('more'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused || moreMenu?.isOpen ? 'menu' : 'menu-outline'}
              focused={focused || !!moreMenu?.isOpen}
              color={moreMenu?.isOpen ? colors.tabBarForeground : color}
              pillColor={colors.tabBarActivePill}
              tapMin={tapMin}
            />
          ),
          tabBarButton: props => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('more')}
              onPress={() => moreMenu?.openMore()}
              style={props.style}
            >
              {props.children}
            </Pressable>
          ),
        }}
      />
      {/* Keep registered for deep links / programmatic navigate */}
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: t('settings'), ...hiddenTabOptions }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
});

export default MainTabs;

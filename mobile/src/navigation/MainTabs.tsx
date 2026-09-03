import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DashboardScreen from '../screens/DashboardScreen';
import TodayScreen from '../screens/TodayScreen';
import CalendarScreen from '../screens/CalendarScreen';
import FieldsListScreen from '../screens/FieldsListScreen';
import TaskListScreen from '../screens/TaskListScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { MainTabParamList } from './types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useTasks } from '../hooks/useTasks';
import { typography, spacing } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TabIcon = ({
  name,
  focused,
  color,
  pillColor,
  accentColor,
  tapMin,
}: {
  name: IconName;
  focused: boolean;
  color: string;
  pillColor: string;
  accentColor: string;
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
        borderWidth: 1,
        borderColor: accentColor + '40',
      },
    ]}
  >
    <Ionicons name={name} size={22} color={color} />
  </View>
);

/** Keep screen mounted for deep links; hide from Everyday thumb bar. */
const hiddenTabOptions = {
  tabBarButton: () => null as unknown as React.ReactElement,
  tabBarItemStyle: { display: 'none' as const },
};

const MainTabs = () => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation('nav');
  const { isFieldOwner } = useAuth();
  const { isEveryday, isFullPicture, tapMin, fontScaleMultiplier } = usePreferences();
  const { tasks } = useTasks();
  const insets = useSafeAreaInsets();
  const owner = isFieldOwner();
  // Dashboard only for Full picture + FieldOwner. Everyday home is always Today.
  const showDashboard = owner && isFullPicture;

  const openTaskCount = useMemo(
    () => tasks.filter((tk) => tk.status !== 'completed').length,
    [tasks]
  );

  const labelSize = Math.max(12, Math.round(12 * fontScaleMultiplier));
  const tabBarHeight =
    Math.max(64, tapMin + 20) + Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 4);
  const tabAccent = colors.headerAccent;

  return (
    <Tab.Navigator
      initialRouteName={showDashboard ? 'Dashboard' : 'Today'}
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
          elevation: isDark ? 16 : 12,
          shadowColor: colors.shadowDark,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.35 : 0.2,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          ...typography.styles.caption,
          fontSize: labelSize,
          fontWeight: '700',
          marginTop: 0,
        },
        tabBarItemStyle: {
          minHeight: tapMin,
          paddingVertical: 2,
        },
      }}
    >
      {showDashboard ? (
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: t('dashboard'),
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                name={focused ? 'grid' : 'grid-outline'}
                focused={focused}
                color={color}
                pillColor={colors.tabBarActivePill}
                accentColor={tabAccent}
                tapMin={tapMin}
              />
            ),
          }}
        />
      ) : null}

      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{
          tabBarLabel: t('today'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'sunny' : 'sunny-outline'}
              focused={focused}
              color={color}
              pillColor={colors.tabBarActivePill}
              accentColor={tabAccent}
              tapMin={tapMin}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Fields"
        component={FieldsListScreen}
        options={{
          tabBarLabel: owner ? t('fieldsOwner') : t('fields'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'leaf' : 'leaf-outline'}
              focused={focused}
              color={color}
              pillColor={colors.tabBarActivePill}
              accentColor={tabAccent}
              tapMin={tapMin}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Tasks"
        component={TaskListScreen}
        options={{
          tabBarLabel: owner ? t('tasks') : t('tasksProducer'),
          tabBarBadge:
            openTaskCount > 0 ? (openTaskCount > 99 ? '99+' : String(openTaskCount)) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.error,
            color: '#FFFCF6',
            fontSize: Math.max(10, labelSize - 2),
            fontWeight: '700',
            minWidth: 18,
            height: 18,
            lineHeight: 18,
          },
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'list' : 'list-outline'}
              focused={focused}
              color={color}
              pillColor={colors.tabBarActivePill}
              accentColor={tabAccent}
              tapMin={tapMin}
            />
          ),
        }}
      />

      {/* Calendar: Full picture primary; Everyday opens it from More only. */}
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: t('calendar'),
          ...(isEveryday ? hiddenTabOptions : {}),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'calendar' : 'calendar-outline'}
              focused={focused}
              color={color}
              pillColor={colors.tabBarActivePill}
              accentColor={tabAccent}
              tapMin={tapMin}
            />
          ),
        }}
      />

      <Tab.Screen
        name="More"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('more'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'menu' : 'menu-outline'}
              focused={focused}
              color={color}
              pillColor={colors.tabBarActivePill}
              accentColor={tabAccent}
              tapMin={tapMin}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MainTabs;

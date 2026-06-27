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
import { useTasks } from '../hooks/useTasks';
import { typography, spacing } from '../theme';

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
      focused && { backgroundColor: pillColor, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
    ]}
  >
    <Ionicons name={name} size={22} color={color} />
  </View>
);

const MainTabs = () => {
  const { colors } = useTheme();
  const { t } = useTranslation('nav');
  const { isFieldOwner } = useAuth();
  const { tasks } = useTasks();
  const insets = useSafeAreaInsets();
  const owner = isFieldOwner();

  const openTaskCount = useMemo(
    () => tasks.filter(tk => tk.status !== 'completed').length,
    [tasks]
  );

  const tabBarHeight = 58 + Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 4);

  return (
    <Tab.Navigator
      initialRouteName={owner ? 'Dashboard' : 'Today'}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.textInverse,
        tabBarInactiveTintColor: colors.textInverse + '99',
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopWidth: 0,
          paddingTop: spacing.xs,
          paddingBottom: Math.max(insets.bottom, spacing.xs),
          height: tabBarHeight,
          elevation: 12,
          shadowColor: colors.shadowDark,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          ...typography.styles.caption,
          fontSize: 10,
          fontWeight: '700',
          marginTop: 0,
        },
      }}
    >
      {owner ? (
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
              />
            ),
          }}
        />
      ) : (
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
              />
            ),
          }}
        />
      )}
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: t('calendar'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'calendar' : 'calendar-outline'}
              focused={focused}
              color={color}
              pillColor={colors.tabBarActivePill}
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
            />
          ),
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TaskListScreen}
        options={{
          tabBarLabel: owner ? t('tasks') : t('tasksProducer'),
          tabBarBadge: openTaskCount > 0 ? (openTaskCount > 99 ? '99+' : openTaskCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.error,
            color: colors.textInverse,
            fontSize: 10,
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
              name={focused ? 'settings' : 'settings-outline'}
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
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MainTabs;

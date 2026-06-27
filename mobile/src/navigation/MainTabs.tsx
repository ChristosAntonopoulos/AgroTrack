import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import DashboardScreen from '../screens/DashboardScreen';
import TodayScreen from '../screens/TodayScreen';
import CalendarScreen from '../screens/CalendarScreen';
import FieldsListScreen from '../screens/FieldsListScreen';
import TaskListScreen from '../screens/TaskListScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { MainTabParamList } from './types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { typography, spacing } from '../theme';
import { createElevation } from '../theme/elevation';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TabIcon = ({
  name,
  focused,
  color,
}: {
  name: IconName;
  focused: boolean;
  color: string;
}) => (
  <Ionicons name={name} size={22} color={color} style={{ opacity: focused ? 1 : 0.55 }} />
);

const MainTabs = () => {
  const { colors } = useTheme();
  const { t } = useTranslation('nav');
  const { isFieldOwner } = useAuth();
  const owner = isFieldOwner();

  return (
    <Tab.Navigator
      initialRouteName={owner ? 'Dashboard' : 'Today'}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surfaceElevated,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: spacing.xs,
          paddingBottom: spacing.xs,
          height: 62,
          ...createElevation(colors, 'lg'),
        },
        tabBarLabelStyle: {
          ...typography.styles.caption,
          fontSize: 10,
          fontWeight: '600',
          marginTop: -2,
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
              <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} color={color} />
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
              <TabIcon name={focused ? 'sunny' : 'sunny-outline'} focused={focused} color={color} />
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
            <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Fields"
        component={FieldsListScreen}
        options={{
          tabBarLabel: owner ? t('fieldsOwner') : t('fields'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'leaf' : 'leaf-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TaskListScreen}
        options={{
          tabBarLabel: owner ? t('tasks') : t('tasksProducer'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'list' : 'list-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('more'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;

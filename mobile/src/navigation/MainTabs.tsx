import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import DashboardScreen from '../screens/DashboardScreen';
import FieldsListScreen from '../screens/FieldsListScreen';
import TaskListScreen from '../screens/TaskListScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { MainTabParamList } from './types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { typography } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TabIcon = ({ emoji, focused, color }: { emoji: string; focused: boolean; color: string }) => (
  <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.6, color }]}>{emoji}</Text>
);

const MainTabs = () => {
  const { colors } = useTheme();
  const { t } = useTranslation('nav');
  const { isFieldOwner } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          ...typography.styles.caption,
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('home'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="🏠" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Fields"
        component={FieldsListScreen}
        options={{
          tabBarLabel: isFieldOwner() ? t('fieldsOwner') : t('fields'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="🫒" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TaskListScreen}
        options={{
          tabBarLabel: isFieldOwner() ? t('tasks') : t('tasksProducer'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="📋" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('more'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="⚙️" focused={focused} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabIcon: { fontSize: 22 },
});

export default MainTabs;

import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from '../theme';
import AuthNavigator from './AuthNavigator';
import MainLayout from './MainLayout';
import FieldDetailScreen from '../screens/FieldDetailScreen';
import FieldHistoryScreen from '../screens/FieldHistoryScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import FieldFormScreen from '../screens/FieldFormScreen';
import FieldMapBoundaryScreen from '../screens/FieldMapBoundaryScreen';
import CreateTaskScreen from '../screens/CreateTaskScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ThisHarvestScreen from '../screens/ThisHarvestScreen';
import PeopleScreen from '../screens/PeopleScreen';
import LoadingSpinner from '../components/LoadingSpinner';
import { RootStackParamList } from './types';
import { setSessionExpiredHandler } from '../services/api';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { colors, isDark, fontScaleMultiplier } = useTheme();
  const headerTitleSize = 17 * fontScaleMultiplier;
  const { t } = useTranslation(['nav', 'fields']);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      if (isAuthenticated) {
        logout();
        setSessionExpired(true);
      }
    });
    return () => setSessionExpiredHandler(null);
  }, [isAuthenticated, logout]);

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primaryDark,
      background: colors.background,
      card: colors.surfaceElevated,
      text: colors.textPrimary,
      border: colors.border,
    },
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surfaceElevated },
          headerTintColor: colors.primaryDark,
          headerTitleStyle: { color: colors.textPrimary, fontWeight: '700', fontSize: headerTitleSize },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          animationDuration: motion.durationMs.ui,
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{ headerShown: false }}
            initialParams={sessionExpired ? { screen: 'SessionExpired' } : undefined}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainLayout}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="FieldDetail"
              component={FieldDetailScreen}
              options={{
                title: t('fields'),
                headerBackTitle: t('home'),
                headerStyle: { backgroundColor: colors.headerBackground },
                headerTintColor: colors.headerForeground,
                headerTitleStyle: {
                  color: colors.headerForeground,
                  fontWeight: '700',
                  fontSize: headerTitleSize,
                },
              }}
            />
            <Stack.Screen
              name="TaskDetail"
              component={TaskDetailScreen}
              options={{ title: t('tasks'), headerBackTitle: t('home') }}
            />
            <Stack.Screen
              name="FieldHistory"
              component={FieldHistoryScreen}
              options={{
                title: t('fields:history.button'),
                headerBackTitle: t('fields'),
                headerStyle: { backgroundColor: colors.headerBackground },
                headerTintColor: colors.headerForeground,
                headerTitleStyle: {
                  color: colors.headerForeground,
                  fontWeight: '700',
                  fontSize: headerTitleSize,
                },
              }}
            />
            <Stack.Screen
              name="FieldForm"
              component={FieldFormScreen}
              options={({ route }) => ({
                title: route.params?.fieldId
                  ? t('fields:editField')
                  : t('fields:addField.title'),
                presentation: 'modal',
                headerStyle: { backgroundColor: colors.headerBackground },
                headerTintColor: colors.headerForeground,
                headerTitleStyle: {
                  color: colors.headerForeground,
                  fontWeight: '700',
                  fontSize: headerTitleSize,
                },
              })}
            />
            <Stack.Screen
              name="FieldMapBoundary"
              component={FieldMapBoundaryScreen}
              options={{ title: t('fields'), presentation: 'modal' }}
            />
            <Stack.Screen
              name="CreateTask"
              component={CreateTaskScreen}
              options={{ title: t('tasks'), presentation: 'modal' }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ title: t('notifications') }}
            />
            <Stack.Screen
              name="ThisHarvest"
              component={ThisHarvestScreen}
              options={{
                title: t('fields:thisHarvest.title', { defaultValue: 'This harvest' }),
                headerBackTitle: t('more'),
              }}
            />
            <Stack.Screen
              name="People"
              component={PeopleScreen}
              options={{
                title: t('fields:people.title', { defaultValue: 'People' }),
                headerBackTitle: t('more'),
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;

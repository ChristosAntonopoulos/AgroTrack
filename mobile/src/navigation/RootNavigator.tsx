import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AuthNavigator from './AuthNavigator';
import MainLayout from './MainLayout';
import FieldDetailScreen from '../screens/FieldDetailScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import FieldFormScreen from '../screens/FieldFormScreen';
import CreateTaskScreen from '../screens/CreateTaskScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import LoadingSpinner from '../components/LoadingSpinner';
import { RootStackParamList } from './types';
import { setSessionExpiredHandler } from '../services/api';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation('nav');
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
      primary: colors.primary,
      background: colors.background,
      card: colors.white,
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
          headerStyle: { backgroundColor: colors.white },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.textPrimary, fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
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
              options={{ title: t('fields'), headerBackTitle: t('home') }}
            />
            <Stack.Screen
              name="TaskDetail"
              component={TaskDetailScreen}
              options={{ title: t('tasks'), headerBackTitle: t('home') }}
            />
            <Stack.Screen
              name="FieldForm"
              component={FieldFormScreen}
              options={({ route }) => ({
                title: route.params?.fieldId
                  ? t('fields')
                  : t('fields'),
                presentation: 'modal',
              })}
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;

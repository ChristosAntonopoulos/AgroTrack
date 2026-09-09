import React, { useEffect, useRef, useState } from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  NavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from '../theme';
import AuthNavigator from './AuthNavigator';
import MainLayout from './MainLayout';
import FieldDetailScreen from '../screens/FieldDetailScreen';
import FieldWeatherVegetationScreen from '../screens/FieldWeatherVegetationScreen';
import ChronologioScreen from '../screens/ChronologioScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import FieldFormScreen from '../screens/FieldFormScreen';
import FieldMapBoundaryScreen from '../screens/FieldMapBoundaryScreen';
import CreateTaskScreen from '../screens/CreateTaskScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotesListScreen from '../screens/NotesListScreen';
import ThisHarvestScreen from '../screens/ThisHarvestScreen';
import ThisHarvestReviewScreen from '../screens/ThisHarvestReviewScreen';
import MoneyScreen from '../screens/MoneyScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import InviteAcceptScreen from '../screens/InviteAcceptScreen';
import FamilyInviteAcceptScreen from '../screens/FamilyInviteAcceptScreen';
import PartnersHomeScreen from '../screens/PartnersHomeScreen';
import PartnerSearchScreen from '../screens/PartnerSearchScreen';
import PartnerProfileScreen from '../screens/PartnerProfileScreen';
import ServiceProfileScreen from '../screens/ServiceProfileScreen';
import ServiceRequestsScreen from '../screens/ServiceRequestsScreen';
import LoadingSpinner from '../components/LoadingSpinner';
import { RootStackParamList } from './types';
import { setSessionExpiredHandler } from '../services/api';
import { takePendingFamilyInviteToken, takePendingInviteToken } from '../utils/pendingInvite';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { colors, isDark, fontScaleMultiplier } = useTheme();
  const headerTitleSize = 17 * fontScaleMultiplier;
  const { t } = useTranslation(['nav', 'fields', 'partners', 'dashboard', 'chronologio']);
  const [sessionExpired, setSessionExpired] = useState(false);
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = takePendingInviteToken();
    const familyToken = takePendingFamilyInviteToken();
    if (!token && !familyToken) return;
    const id = setTimeout(() => {
      if (token) navRef.current?.navigate('InviteAccept', { token });
      else if (familyToken) navRef.current?.navigate('FamilyInviteAccept', { token: familyToken });
    }, 0);
    return () => clearTimeout(id);
  }, [isAuthenticated]);

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
    <NavigationContainer
      ref={navRef}
      theme={navTheme}
      linking={{
        prefixes: ['oleachron://', 'https://app.oleachron.app'],
        config: {
          screens: {
            InviteAccept: 'invite/:token',
            FamilyInviteAccept: 'family-invite/:token',
            Auth: {
              screens: {
                Login: 'login',
                Register: 'register',
                InviteAccept: 'invite/:token',
                FamilyInviteAccept: 'family-invite/:token',
                SessionExpired: 'expired',
              },
            },
            Main: {
              screens: {
                Dashboard: 'dashboard',
                Today: 'today',
                Calendar: 'calendar',
                Fields: 'fields',
                Tasks: 'tasks',
                More: 'more',
                Settings: 'settings',
              },
            },
            FieldDetail: 'fields/:fieldId',
            Chronologio: 'chronologio/:fieldId?',
            FieldWeatherVegetation: 'fields/:fieldId/weather-vegetation',
            Money: 'money',
            Analytics: 'analytics',
            Reports: 'reports',
            ThisHarvest: 'this-harvest',
            ThisHarvestReview: 'this-harvest/review',
            Notifications: 'notifications',
            Partners: 'partners',
            NotesList: 'notes',
          },
        },
      }}
    >
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
              name="Chronologio"
              component={ChronologioScreen}
              options={{
                title: t('chronologio:title'),
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
              name="FieldWeatherVegetation"
              component={FieldWeatherVegetationScreen}
              options={{
                title: t('chronologio:weatherVegetation.button'),
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
              name="NotesList"
              component={NotesListScreen}
              options={{ title: t('dashboard:notes.title', { defaultValue: 'Notes' }), headerBackTitle: t('home') }}
            />
            <Stack.Screen
              name="InviteAccept"
              component={InviteAcceptScreen}
              options={{ title: t('fields:people.inviteAcceptTitle', { defaultValue: 'Join this field' }) }}
            />
            <Stack.Screen
              name="FamilyInviteAccept"
              component={FamilyInviteAcceptScreen}
              options={{ title: t('partners:family.acceptTitle', { defaultValue: 'Family invite' }) }}
            />
            <Stack.Screen
              name="ThisHarvest"
              component={ThisHarvestScreen}
              options={{
                title: t('fields:thisHarvest.title', { defaultValue: 'This Rod' }),
                headerBackTitle: t('more'),
              }}
            />
            <Stack.Screen
              name="ThisHarvestReview"
              component={ThisHarvestReviewScreen}
              options={{
                title: t('fields:apologismos.title', { defaultValue: 'Year review' }),
                headerBackTitle: t('fields:thisHarvest.title', { defaultValue: 'This Rod' }),
              }}
            />
            <Stack.Screen
              name="Money"
              component={MoneyScreen}
              options={{ title: t('nav:money', { defaultValue: 'Costs' }), headerBackTitle: t('more') }}
            />
            <Stack.Screen
              name="Analytics"
              component={AnalyticsScreen}
              options={{ title: t('nav:analytics', { defaultValue: 'Analytics' }), headerBackTitle: t('more') }}
            />
            <Stack.Screen
              name="Reports"
              component={ReportsScreen}
              options={{ title: t('nav:reports', { defaultValue: 'Reports' }), headerBackTitle: t('more') }}
            />
            <Stack.Screen
              name="Partners"
              component={PartnersHomeScreen}
              options={{ title: t('partners', { defaultValue: 'Partners' }), headerBackTitle: t('more') }}
            />
            <Stack.Screen
              name="PartnerSearch"
              component={PartnerSearchScreen}
              options={{ title: t('partners', { defaultValue: 'Partners' }) }}
            />
            <Stack.Screen
              name="PartnerProfile"
              component={PartnerProfileScreen}
              options={{ title: t('partners', { defaultValue: 'Partners' }) }}
            />
            <Stack.Screen
              name="MyServices"
              component={ServiceProfileScreen}
              options={{ title: t('partners', { defaultValue: 'Partners' }) }}
            />
            <Stack.Screen
              name="ServiceRequests"
              component={ServiceRequestsScreen}
              options={{ title: t('partners', { defaultValue: 'Partners' }) }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;

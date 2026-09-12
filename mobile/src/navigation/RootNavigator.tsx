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
import { CaptureProvider } from '../context/CaptureContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from '../theme';
import AuthNavigator from './AuthNavigator';
import MainLayout from './MainLayout';
import FieldDetailScreen from '../screens/FieldDetailScreen';
import FieldWeatherVegetationScreen from '../screens/FieldWeatherVegetationScreen';
import ChronologioScreen from '../screens/ChronologioScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import TaskCompletionScreen from '../screens/TaskCompletionScreen';
import FieldFormScreen from '../screens/FieldFormScreen';
import FieldMapBoundaryScreen from '../screens/FieldMapBoundaryScreen';
import CreateTaskScreen from '../screens/CreateTaskScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotesListScreen from '../screens/NotesListScreen';
import HarvestCampaignScreen from '../screens/HarvestCampaignScreen';
import ThisHarvestReviewScreen from '../screens/ThisHarvestReviewScreen';
import MoneyScreen from '../screens/MoneyScreen';
import PhotoHubScreen from '../screens/PhotoHubScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import InviteAcceptScreen from '../screens/InviteAcceptScreen';
import FamilyInviteAcceptScreen from '../screens/FamilyInviteAcceptScreen';
import PartnerInviteAcceptScreen from '../screens/PartnerInviteAcceptScreen';
import PartnersHomeScreen from '../screens/PartnersHomeScreen';
import PartnerSearchScreen from '../screens/PartnerSearchScreen';
import PartnerProfileScreen from '../screens/PartnerProfileScreen';
import ServiceProfileScreen from '../screens/ServiceProfileScreen';
import ServiceRequestsScreen from '../screens/ServiceRequestsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import SettingsScreen from '../screens/SettingsScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import DashboardScreen from '../screens/DashboardScreen';
import LoadingSpinner from '../components/LoadingSpinner';
import { RootStackParamList } from './types';
import { setSessionExpiredHandler } from '../services/api';
import {
  takePendingFamilyInviteToken,
  takePendingInviteToken,
  takePendingPartnerInviteToken,
} from '../utils/pendingInvite';
import { View, StyleSheet } from 'react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { colors, isDark, fontScaleMultiplier } = useTheme();
  const headerTitleSize = 17 * fontScaleMultiplier;
  const { t } = useTranslation(['nav', 'fields', 'partners', 'dashboard', 'chronologio', 'settings', 'feedback', 'common', 'photos']);
  const [sessionExpired, setSessionExpired] = useState(false);
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = takePendingInviteToken();
    const familyToken = takePendingFamilyInviteToken();
    const partnerToken = takePendingPartnerInviteToken();
    if (!token && !familyToken && !partnerToken) return;
    const id = setTimeout(() => {
      if (token) navRef.current?.navigate('InviteAccept', { token });
      else if (familyToken) navRef.current?.navigate('FamilyInviteAccept', { token: familyToken });
      else if (partnerToken) navRef.current?.navigate('PartnerInviteAccept', { token: partnerToken });
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
      primary: colors.primary,
      // Authenticated: transparent so parchment AppCanvas shows through
      background: isAuthenticated ? 'transparent' : colors.background,
      card: colors.headerBackground,
      text: colors.headerForeground,
      border: colors.headerBorder,
    },
  };

  const compactHeader = {
    headerStyle: { backgroundColor: colors.headerBackground },
    headerTintColor: colors.headerForeground,
    headerTitleStyle: {
      color: colors.headerForeground,
      fontWeight: '600' as const,
      fontSize: headerTitleSize,
    },
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal' as const,
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
            PartnerInviteAccept: 'partner-invite/:token',
            Auth: {
              screens: {
                Login: 'login',
                Register: 'register',
                InviteAccept: 'invite/:token',
                FamilyInviteAccept: 'family-invite/:token',
                PartnerInviteAccept: 'partner-invite/:token',
                SessionExpired: 'expired',
              },
            },
            Main: {
              screens: {
                ChronologioTab: 'today',
                Fields: 'fields',
                Tasks: 'tasks',
                More: 'more',
              },
            },
            FieldDetail: 'fields/:fieldId',
            Chronologio: 'chronologio/:fieldId?',
            FieldWeatherVegetation: 'fields/:fieldId/weather-vegetation',
            Money: 'money',
            Photos: 'photos',
            Analytics: 'analytics',
            Reports: 'reports',
            HarvestCampaign: 'harvest',
            ThisHarvest: 'this-harvest',
            ThisHarvestReview: 'this-harvest/review',
            Notifications: 'notifications',
            Partners: 'partners',
            NotesList: 'notes',
            Calendar: 'calendar',
            Settings: 'settings',
            Feedback: 'feedback',
            Dashboard: 'dashboard',
          },
        },
      }}
    >
      <CaptureProvider>
        <View style={styles.shell}>
          <Stack.Navigator
            screenOptions={{
              ...compactHeader,
              contentStyle: {
                backgroundColor: isAuthenticated ? 'transparent' : colors.background,
              },
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
              <Stack.Screen name="Main" component={MainLayout} options={{ headerShown: false }} />
              <Stack.Screen name="FieldDetail" component={FieldDetailScreen} options={{ title: t('fields') }} />
              <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: t('tasks') }} />
              <Stack.Screen
                name="TaskCompletion"
                component={TaskCompletionScreen}
                options={{ title: t('tasks') }}
              />
              <Stack.Screen
                name="Chronologio"
                component={ChronologioScreen}
                options={{ title: t('chronologio:title') }}
              />
              <Stack.Screen
                name="FieldWeatherVegetation"
                component={FieldWeatherVegetationScreen}
                options={{ title: t('chronologio:weatherVegetation.button') }}
              />
              <Stack.Screen
                name="FieldForm"
                component={FieldFormScreen}
                options={({ route }) => ({
                  title: route.params?.fieldId ? t('fields:editField') : t('fields:addField.title'),
                  presentation: 'modal',
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
              <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: t('notifications') }} />
              <Stack.Screen
                name="NotesList"
                component={NotesListScreen}
                options={{ title: t('dashboard:notes.title', { defaultValue: 'Notes' }) }}
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
                name="PartnerInviteAccept"
                component={PartnerInviteAcceptScreen}
                options={{ title: t('partners:ownerPartner.acceptTitle', { defaultValue: 'Partner invite' }) }}
              />
              <Stack.Screen
                name="HarvestCampaign"
                component={HarvestCampaignScreen}
                options={{
                  title: t('fields:harvestCampaign.title', {
                    defaultValue: t('fields:thisHarvest.title', { defaultValue: 'Harvest' }),
                  }),
                }}
              />
              <Stack.Screen
                name="ThisHarvest"
                component={HarvestCampaignScreen}
                options={{
                  title: t('fields:harvestCampaign.title', {
                    defaultValue: t('fields:thisHarvest.title', { defaultValue: 'Harvest' }),
                  }),
                }}
              />
              <Stack.Screen
                name="ThisHarvestReview"
                component={ThisHarvestReviewScreen}
                options={{ title: t('fields:apologismos.title', { defaultValue: 'Year review' }) }}
              />
              <Stack.Screen
                name="Money"
                component={MoneyScreen}
                options={{ title: t('nav:money', { defaultValue: 'Costs' }) }}
              />
              <Stack.Screen
                name="Photos"
                component={PhotoHubScreen}
                options={{ title: t('photos:title', { defaultValue: 'Photo Hub' }) }}
              />
              <Stack.Screen
                name="Analytics"
                component={AnalyticsScreen}
                options={{ title: t('nav:analytics', { defaultValue: 'Analytics' }) }}
              />
              <Stack.Screen
                name="Reports"
                component={ReportsScreen}
                options={{ title: t('nav:reports', { defaultValue: 'Reports' }) }}
              />
              <Stack.Screen
                name="Partners"
                component={PartnersHomeScreen}
                options={{ title: t('nav:partners', { defaultValue: 'Partners' }) }}
              />
              <Stack.Screen
                name="PartnerSearch"
                component={PartnerSearchScreen}
                options={{ title: t('nav:partners', { defaultValue: 'Partners' }) }}
              />
              <Stack.Screen
                name="PartnerProfile"
                component={PartnerProfileScreen}
                options={{ title: t('nav:partners', { defaultValue: 'Partners' }) }}
              />
              <Stack.Screen
                name="MyServices"
                component={ServiceProfileScreen}
                options={{ title: t('nav:partners', { defaultValue: 'Partners' }) }}
              />
              <Stack.Screen
                name="ServiceRequests"
                component={ServiceRequestsScreen}
                options={{ title: t('nav:partners', { defaultValue: 'Partners' }) }}
              />
              <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: t('calendar') }} />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: t('settings:title', { defaultValue: t('settings') }) }}
              />
              <Stack.Screen
                name="Feedback"
                component={FeedbackScreen}
                options={{ title: t('feedback', { defaultValue: 'Feedback' }) }}
              />
              <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: t('dashboard') }} />
            </>
          )}
        </Stack.Navigator>
        </View>
      </CaptureProvider>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  shell: { flex: 1 },
});

export default RootNavigator;

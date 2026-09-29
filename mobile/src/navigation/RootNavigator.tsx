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
import { InAppMessageProvider } from '../context/InAppMessageContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from '../theme';
import StackScreenHeader from './StackScreenHeader';
import AuthNavigator from './AuthNavigator';
import MainLayout from './MainLayout';
import FieldDetailScreen from '../screens/FieldDetailScreen';
import FieldWeatherVegetationScreen from '../screens/FieldWeatherVegetationScreen';
import ChronologioStackRedirect from '../screens/ChronologioStackRedirect';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import TaskCompletionScreen from '../screens/TaskCompletionScreen';
import FieldFormScreen from '../screens/FieldFormScreen';
import FieldWorkSetupScreen from '../screens/FieldWorkSetupScreen';
import FieldWorkProfileScreen from '../screens/FieldWorkProfileScreen';
import LegalScreen from '../screens/LegalScreen';
import FieldMapBoundaryScreen from '../screens/FieldMapBoundaryScreen';
import CreateTaskScreen from '../screens/CreateTaskScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import HarvestCampaignRedirect from '../screens/HarvestCampaignRedirect';
import ThisHarvestReviewScreen from '../screens/ThisHarvestReviewScreen';
import MoneyScreen from '../screens/MoneyScreen';
import MyOilScreen from '../screens/MyOilScreen';
import PhotoHubScreen from '../screens/PhotoHubScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import InviteAcceptScreen from '../screens/InviteAcceptScreen';
import PartnersHomeScreen from '../screens/PartnersHomeScreen';
import PartnerSearchScreen from '../screens/PartnerSearchScreen';
import PartnerProfileScreen from '../screens/PartnerProfileScreen';
import ServiceProfileScreen from '../screens/ServiceProfileScreen';
import ServiceRequestsScreen from '../screens/ServiceRequestsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpScreen from '../screens/HelpScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import LegacyHomeRedirect from '../screens/LegacyHomeRedirect';
import LoadingSpinner from '../components/LoadingSpinner';
import { RootStackParamList } from './types';
import { setSessionExpiredHandler } from '../services/api';
import {
  takePendingFamilyInviteToken,
  takePendingInviteToken,
  takePendingPartnerInviteToken,
} from '../utils/pendingInvite';
import { View, StyleSheet } from 'react-native';
import OwnerActivationHost from '../components/onboarding/OwnerActivationHost';
import ActivationGate from '../components/onboarding/ActivationGate';
import NavCoach from '../components/onboarding/NavCoach';
import { OwnerActivationProvider } from '../onboarding/OwnerActivationContext';
import AppDock from './AppDock';
import { DockProvider } from './DockContext';
import { dockHiddenForRoute, getFocusedRoute, type FocusedRoute } from './dockRoute';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation(['nav', 'fields', 'partners', 'chronologio', 'settings', 'help', 'feedback', 'common', 'photos', 'legal']);
  const [sessionExpired, setSessionExpired] = useState(false);
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [focusedRoute, setFocusedRoute] = useState<FocusedRoute>({ name: '' });

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = takePendingInviteToken() || takePendingFamilyInviteToken() || takePendingPartnerInviteToken();
    if (!token) return;
    const id = setTimeout(() => {
      navRef.current?.navigate('InviteAccept', { token });
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

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <NavigationContainer
      ref={navRef}
      onReady={() => setFocusedRoute(getFocusedRoute(navRef.current?.getRootState()))}
      onStateChange={(state) => setFocusedRoute(getFocusedRoute(state))}
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
                ForgotPassword: 'forgot-password',
                ResetPassword: 'reset-password',
                Legal: 'legal/:kind',
                InviteAccept: 'invite/:token',
                SessionExpired: 'expired',
              },
            },
            Main: {
              screens: {
                Launcher: 'workspace',
                ChronologioTab: 'today',
                Fields: {
                  screens: {
                    FieldsHome: 'fields',
                    HarvestCampaign: 'harvest',
                  },
                },
                Tasks: 'tasks',
                More: 'more',
              },
            },
            FieldDetail: 'fields/:fieldId',
            Chronologio: 'chronologio/:fieldId?',
            FieldWeatherVegetation: 'fields/:fieldId/weather-vegetation',
            Money: 'money',
            MyOil: 'my-oil',
            Photos: 'photos',
            Analytics: 'analytics',
            Reports: 'reports',
            ThisHarvest: 'this-harvest',
            ThisHarvestReview: 'this-harvest/review',
            Notifications: 'notifications',
            Partners: 'partners',
            NotesList: 'notes',
            Calendar: 'calendar',
            Settings: 'settings',
            Help: 'help',
            Feedback: 'feedback',
            Dashboard: 'dashboard',
          },
        },
      }}
    >
      <CaptureProvider>
        <InAppMessageProvider>
        <OwnerActivationProvider navRef={navRef}>
        <DockProvider visible={isAuthenticated && !dockHiddenForRoute(focusedRoute.name)}>
        <View style={styles.shell}>
          <Stack.Navigator
            screenOptions={{
              header: (props) => <StackScreenHeader {...props} />,
              headerTransparent: true,
              headerShadowVisible: false,
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
              <Stack.Screen name="FieldDetail" component={FieldDetailScreen} options={{ title: '' }} />
              <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: '' }} />
              <Stack.Screen
                name="TaskCompletion"
                component={TaskCompletionScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Chronologio"
                component={ChronologioStackRedirect}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="FieldWeatherVegetation"
                component={FieldWeatherVegetationScreen}
                options={{ title: '' }}
              />
              <Stack.Screen
                name="FieldForm"
                component={FieldFormScreen}
                options={{
                  title: '',
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="FieldWorkSetup"
                component={FieldWorkSetupScreen}
                options={{
                  headerShown: false,
                  presentation: 'fullScreenModal',
                  gestureEnabled: true,
                }}
              />
              <Stack.Screen
                name="FieldWorkProfile"
                component={FieldWorkProfileScreen}
                options={{ title: t('tasks:fieldWork.profile.title') }}
              />
              <Stack.Screen
                name="FieldMapBoundary"
                component={FieldMapBoundaryScreen}
                options={{ title: '', presentation: 'modal' }}
              />
              <Stack.Screen
                name="CreateTask"
                component={CreateTaskScreen}
                options={{ title: '', presentation: 'modal' }}
              />
              <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: t('notifications') }} />
              <Stack.Screen
                name="Legal"
                component={LegalScreen}
                options={({ route }) => ({
                  title: t(`legal:${route.params?.kind || 'privacy'}.title`),
                })}
              />
              <Stack.Screen
                name="NotesList"
                component={LegacyHomeRedirect}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="InviteAccept"
                component={InviteAcceptScreen}
                options={{ title: t('fields:people.inviteAcceptTitle', { defaultValue: 'Join this field' }) }}
              />
              <Stack.Screen
                name="FamilyInviteAccept"
                component={InviteAcceptScreen}
                options={{ title: t('partners:family.acceptTitle', { defaultValue: 'Family invite' }) }}
              />
              <Stack.Screen
                name="PartnerInviteAccept"
                component={InviteAcceptScreen}
                options={{ title: t('partners:ownerPartner.acceptTitle', { defaultValue: 'Partner invite' }) }}
              />
              <Stack.Screen
                name="HarvestCampaign"
                component={HarvestCampaignRedirect}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ThisHarvest"
                component={HarvestCampaignRedirect}
                options={{ headerShown: false }}
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
                name="MyOil"
                component={MyOilScreen}
                options={{ title: t('nav:myOil', { defaultValue: 'My oil' }) }}
              />
              <Stack.Screen
                name="Photos"
                component={PhotoHubScreen}
                options={{ headerShown: false }}
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
              <Stack.Screen name="Calendar" component={CalendarScreen} options={{ headerShown: false }} />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: t('settings:title', { defaultValue: t('settings') }) }}
              />
              <Stack.Screen
                name="Help"
                component={HelpScreen}
                options={{ title: t('help:title', { defaultValue: t('help') }) }}
              />
              <Stack.Screen
                name="Feedback"
                component={FeedbackScreen}
                options={{ title: t('feedback', { defaultValue: 'Feedback' }) }}
              />
              <Stack.Screen name="Dashboard" component={LegacyHomeRedirect} options={{ headerShown: false }} />
            </>
          )}
        </Stack.Navigator>
        {isAuthenticated ? (
          <>
            <ActivationGate navRef={navRef} />
            <OwnerActivationHost />
          </>
        ) : null}
        {isAuthenticated && !dockHiddenForRoute(focusedRoute.name) ? (
          <AppDock route={focusedRoute} />
        ) : null}
        {isAuthenticated ? <NavCoach /> : null}
        </View>
        </DockProvider>
        </OwnerActivationProvider>
        </InAppMessageProvider>
      </CaptureProvider>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  shell: { flex: 1 },
});

export default RootNavigator;

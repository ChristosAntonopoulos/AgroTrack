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
import { DialogProvider } from '../context/DialogContext';
import { InAppMessageProvider } from '../context/InAppMessageContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from '../theme';
import StackScreenHeader from './StackScreenHeader';
import AuthNavigator from './AuthNavigator';
import MainLayout from './MainLayout';
import FieldDetailScreen from '../screens/FieldDetailScreen';
import FieldWeatherVegetationScreen from '../screens/FieldWeatherVegetationScreen';
import ChronologioScreen from '../screens/ChronologioScreen';
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
import SubscriptionScreen from '../screens/SubscriptionScreen';
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
import { View, StyleSheet, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import OwnerActivationHost from '../components/onboarding/OwnerActivationHost';
import NavCoach from '../components/onboarding/NavCoach';
import SkipOnboarding from '../components/onboarding/SkipOnboarding';
import OnboardingFinishedModal from '../components/onboarding/OnboardingFinishedModal';
import ActivationGate from '../components/onboarding/ActivationGate';
import { OwnerActivationProvider } from '../onboarding/OwnerActivationContext';
import AppDock from './AppDock';
import { DockProvider } from './DockContext';
import { dockHiddenForRoute, getFocusedRoute, type FocusedRoute } from './dockRoute';
import { pushNotificationService } from '../services/pushNotificationService';
import { setPendingInviteToken } from '../utils/pendingInvite';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation(['nav', 'fields', 'partners', 'chronologio', 'settings', 'help', 'feedback', 'common', 'photos', 'legal', 'subscription']);
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
    const openInviteFromData = (data: Record<string, unknown> | undefined) => {
      const token = pushNotificationService.extractInviteTokenFromNotificationData(data);
      if (!token) return;
      if (isAuthenticated) {
        navRef.current?.navigate('InviteAccept', { token });
      } else {
        setPendingInviteToken(token);
      }
    };

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      openInviteFromData(response.notification.request.content.data as Record<string, unknown>);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        openInviteFromData(response.notification.request.content.data as Record<string, unknown>);
      }
    });

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isAuthenticated) {
        void pushNotificationService.registerForUser();
      }
    });

    return () => {
      responseSub.remove();
      appStateSub.remove();
    };
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
        prefixes: [
          'theolivelot://',
          'https://theolivelot.com',
          'https://www.theolivelot.com',
        ],
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
            MyOil: {
              path: 'my-oil',
              parse: {
                field: (value: string) => value || undefined,
              },
            },
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
            Subscription: 'subscription',
            Help: 'help',
            Feedback: 'feedback',
            Dashboard: 'dashboard',
          },
        },
      }}
    >
      <DialogProvider>
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
                component={ChronologioScreen}
                options={{ title: t('nav:chronologio', { defaultValue: 'History' }) }}
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
                options={{ headerShown: false, presentation: 'fullScreenModal' }}
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
                options={{ title: t('nav:myOil', { defaultValue: 'Storage' }) }}
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
                name="Subscription"
                component={SubscriptionScreen}
                options={{ title: t('subscription:billing.title') }}
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
        {isAuthenticated ? <SkipOnboarding routeName={focusedRoute.name} /> : null}
        {isAuthenticated ? <OnboardingFinishedModal /> : null}
        </View>
        </DockProvider>
        </OwnerActivationProvider>
        </InAppMessageProvider>
      </CaptureProvider>
      </DialogProvider>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  shell: { flex: 1 },
});

export default RootNavigator;

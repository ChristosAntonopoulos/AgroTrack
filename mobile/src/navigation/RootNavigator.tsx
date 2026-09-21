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
import { getFieldService } from '../services/serviceFactory';
import { isFieldSetupIncomplete } from '../utils/fieldDisplay';
import { CaptureProvider } from '../context/CaptureContext';
import { InAppMessageProvider } from '../context/InAppMessageContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from '../theme';
import AuthNavigator from './AuthNavigator';
import MainLayout from './MainLayout';
import FieldDetailScreen from '../screens/FieldDetailScreen';
import FieldWeatherVegetationScreen from '../screens/FieldWeatherVegetationScreen';
import ChronologioStackRedirect from '../screens/ChronologioStackRedirect';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import TaskCompletionScreen from '../screens/TaskCompletionScreen';
import FieldFormScreen from '../screens/FieldFormScreen';
import FieldWorkSetupScreen from '../screens/FieldWorkSetupScreen';
import FieldMapBoundaryScreen from '../screens/FieldMapBoundaryScreen';
import CreateTaskScreen from '../screens/CreateTaskScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import HarvestCampaignRedirect from '../screens/HarvestCampaignRedirect';
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

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { isAuthenticated, isLoading, logout, user, isFieldOwner } = useAuth();
  const { colors, isDark, fontScaleMultiplier } = useTheme();
  const headerTitleSize = 17 * fontScaleMultiplier;
  const { t } = useTranslation(['nav', 'fields', 'partners', 'chronologio', 'settings', 'feedback', 'common', 'photos']);
  const [sessionExpired, setSessionExpired] = useState(false);
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const firstGroveChecked = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      firstGroveChecked.current = false;
      return;
    }
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
    if (!isAuthenticated || !isFieldOwner() || firstGroveChecked.current) return;
    firstGroveChecked.current = true;
    const userId = user?.id || '';
    void getFieldService()
      .getFields(userId, user?.role || 'FieldOwner')
      .then((fields) => {
        if (!fields.length) {
          navRef.current?.navigate('FieldForm', {});
          return;
        }
        if (fields.some((field) => field.status === 'Active')) return;
        const draft = fields.find((field) => isFieldSetupIncomplete(field.status));
        if (draft) navRef.current?.navigate('FieldForm', { fieldId: draft.id });
      })
      .catch(() => undefined);
  }, [isAuthenticated, isFieldOwner, user]);

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
            Feedback: 'feedback',
            Dashboard: 'dashboard',
          },
        },
      }}
    >
      <CaptureProvider>
        <InAppMessageProvider>
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
                component={ChronologioStackRedirect}
                options={{ headerShown: false }}
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
                name="FieldWorkSetup"
                component={FieldWorkSetupScreen}
                options={{
                  headerShown: false,
                  presentation: 'fullScreenModal',
                  gestureEnabled: true,
                }}
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
                name="Photos"
                component={PhotoHubScreen}
                options={{ title: t('nav:photos', { defaultValue: 'Photos' }) }}
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
              <Stack.Screen name="Dashboard" component={LegacyHomeRedirect} options={{ headerShown: false }} />
            </>
          )}
        </Stack.Navigator>
        </View>
        </InAppMessageProvider>
      </CaptureProvider>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  shell: { flex: 1 },
});

export default RootNavigator;

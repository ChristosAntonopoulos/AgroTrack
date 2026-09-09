import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SessionExpiredScreen from '../screens/SessionExpiredScreen';
import InviteAcceptScreen from '../screens/InviteAcceptScreen';
import FamilyInviteAcceptScreen from '../screens/FamilyInviteAcceptScreen';
import { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  const { t } = useTranslation('auth');

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="InviteAccept" component={InviteAcceptScreen} />
      <Stack.Screen name="FamilyInviteAccept" component={FamilyInviteAcceptScreen} />
      <Stack.Screen
        name="SessionExpired"
        component={SessionExpiredScreen}
        options={{ headerShown: true, title: t('sessionExpired.title') }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;

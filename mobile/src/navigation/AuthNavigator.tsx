import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import LegalScreen from '../screens/LegalScreen';
import SessionExpiredScreen from '../screens/SessionExpiredScreen';
import InviteAcceptScreen from '../screens/InviteAcceptScreen';
import { AuthStackParamList } from './types';
import StackScreenHeader from './StackScreenHeader';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  const { t } = useTranslation(['auth', 'legal']);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        header: (props) => <StackScreenHeader {...props} />,
        headerTransparent: true,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen
        name="Legal"
        component={LegalScreen}
        options={({ route }) => ({
          headerShown: true,
          headerTransparent: true,
          title: t(`legal:${route.params.kind}.title`),
        })}
      />
      <Stack.Screen name="InviteAccept" component={InviteAcceptScreen} />
      <Stack.Screen
        name="SessionExpired"
        component={SessionExpiredScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;

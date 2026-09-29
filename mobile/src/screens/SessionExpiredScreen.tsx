import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import AuthScreen from '../components/auth/AuthScreen';
import AuthButton from '../components/auth/AuthButton';
import AuthAlert from '../components/auth/AuthAlert';
import { AuthStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SessionExpired'>;

const SessionExpiredScreen = () => {
  const { t } = useTranslation('auth');
  const navigation = useNavigation<Nav>();

  return (
    <AuthScreen title={t('sessionExpired.title')} subtitle={t('sessionExpired.subtitle')}>
      <AuthAlert tone="success" message={t('sessionExpired.reassurance')} />
      <AuthButton
        title={t('sessionExpired.button')}
        icon="log-in-outline"
        onPress={() => navigation.replace('Login')}
      />
    </AuthScreen>
  );
};

export default SessionExpiredScreen;

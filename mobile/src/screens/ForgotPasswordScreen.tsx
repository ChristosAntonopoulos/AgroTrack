import React, { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getAuthService } from '../services/serviceFactory';
import AuthScreen, { authLinkStyles } from '../components/auth/AuthScreen';
import AuthTextField from '../components/auth/AuthTextField';
import AuthButton from '../components/auth/AuthButton';
import AuthAlert from '../components/auth/AuthAlert';
import { AuthStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen = () => {
  const { t } = useTranslation(['auth', 'common']);
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.trim()) {
      setError(t('auth:forgot.missingEmail'));
      return;
    }
    setLoading(true);
    try {
      const response = await getAuthService().forgotPassword({ email: email.trim() });
      setSent(true);
      setDevResetToken(response.devResetToken || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth:forgot.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen title={t('auth:forgot.title')} subtitle={t('auth:forgot.subtitle')}>
      {error ? <AuthAlert message={error} /> : null}
      {sent ? (
        <>
          <AuthAlert tone="success" message={t('auth:forgot.sent')} />
          {devResetToken ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('ResetPassword', { token: devResetToken })}
              style={authLinkStyles.row}
            >
              <Text style={authLinkStyles.muted}>
                {t('auth:forgot.localLinkHint')}{' '}
                <Text style={authLinkStyles.accent}>{t('auth:forgot.localLink')}</Text>
              </Text>
            </TouchableOpacity>
          ) : null}
        </>
      ) : (
        <>
          <AuthTextField
            label={t('common:email')}
            placeholder={t('auth:login.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
            leftIcon="mail-outline"
          />
          <AuthButton title={t('auth:forgot.button')} onPress={() => void submit()} loading={loading} />
        </>
      )}
      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={authLinkStyles.row}>
        <Text style={authLinkStyles.accent}>{t('auth:forgot.backToLogin')}</Text>
      </TouchableOpacity>
    </AuthScreen>
  );
};

export default ForgotPasswordScreen;

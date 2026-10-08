import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getAuthService } from '../services/serviceFactory';
import AuthScreen, { authLinkStyles } from '../components/auth/AuthScreen';
import AuthTextField from '../components/auth/AuthTextField';
import AuthButton from '../components/auth/AuthButton';
import AuthAlert from '../components/auth/AuthAlert';
import { AuthStackParamList } from '../navigation/types';
import PasswordStrength from '../components/auth/PasswordStrength';
import { getPasswordIssue } from '../utils/passwordValidation';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type Route = RouteProp<AuthStackParamList, 'ResetPassword'>;

const ResetPasswordScreen = () => {
  const { t } = useTranslation(['auth', 'common']);
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const token = useMemo(() => route.params?.token?.trim() || '', [route.params?.token]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(token ? null : t('auth:reset.missingToken'));
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!token) {
      setError(t('auth:reset.missingToken'));
      return;
    }
    if (!password || !confirmPassword) {
      setError(t('auth:register.missingFields'));
      return;
    }
    const issue = getPasswordIssue(password);
    if (issue === 'tooShort') {
      setError(t('auth:register.passwordTooShort'));
      return;
    }
    if (issue === 'complexity') {
      setError(t('auth:register.passwordComplexity'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth:register.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await getAuthService().resetPassword({ token, password });
      navigation.replace('Login', { reset: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth:reset.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen title={t('auth:reset.title')} subtitle={t('auth:reset.subtitle')}>
      {error ? <AuthAlert message={error} /> : null}
      <AuthTextField
        label={t('auth:reset.passwordLabel')}
        placeholder={t('auth:register.passwordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        showPasswordToggle
        autoComplete="password-new"
        editable={!loading && Boolean(token)}
        leftIcon="lock-closed-outline"
      />
      <PasswordStrength password={password} />
      <AuthTextField
        label={t('auth:register.confirmPassword')}
        placeholder={t('auth:register.confirmPasswordPlaceholder')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        showPasswordToggle
        autoComplete="password-new"
        editable={!loading && Boolean(token)}
        leftIcon="lock-closed-outline"
      />
      <AuthButton
        title={t('auth:reset.button')}
        onPress={() => void submit()}
        loading={loading}
        disabled={!token}
      />
      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={authLinkStyles.row}>
        <Text style={authLinkStyles.accent}>{t('auth:reset.requestNewLink')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={authLinkStyles.row}>
        <Text style={authLinkStyles.accent}>{t('auth:forgot.backToLogin')}</Text>
      </TouchableOpacity>
    </AuthScreen>
  );
};

export default ResetPasswordScreen;

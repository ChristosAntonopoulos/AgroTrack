import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { showDemoLogin } from '../config/env';
import { TestUser } from '../services/mockUsers';
import { rememberInviteIntent } from '../utils/inviteIntent';
import AuthScreen, { authLinkStyles } from '../components/auth/AuthScreen';
import AuthTextField from '../components/auth/AuthTextField';
import AuthButton from '../components/auth/AuthButton';
import AuthAlert from '../components/auth/AuthAlert';
import AuthSocialButtons from '../components/auth/AuthSocialButtons';
import AuthDemoPicker from '../components/auth/AuthDemoPicker';
import { AuthStackParamList } from '../navigation/types';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
type Route = RouteProp<AuthStackParamList, 'Login'>;

const LoginScreen = () => {
  const { login } = useAuth();
  const { t } = useTranslation(['auth', 'common']);
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [email, setEmail] = useState(route.params?.email?.trim() || '');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordReset = route.params?.reset === true;

  useEffect(() => {
    void rememberInviteIntent({
      token: route.params?.token,
      code: route.params?.code,
      email: route.params?.email,
    });
    if (route.params?.email?.trim() && !email.trim()) {
      setEmail(route.params.email.trim());
    }
  }, [route.params?.token, route.params?.code, route.params?.email]);

  const persistInvite = () => {
    void rememberInviteIntent({
      token: route.params?.token,
      code: route.params?.code,
      email: route.params?.email || email.trim() || undefined,
    });
  };

  const validate = () => {
    const nextEmail = !email.trim()
      ? t('auth:login.emailRequired')
      : !isValidEmail(email)
        ? t('auth:login.emailInvalid')
        : undefined;
    const nextPassword = !password ? t('auth:login.passwordRequired') : undefined;
    setEmailError(nextEmail);
    setPasswordError(nextPassword);
    return !nextEmail && !nextPassword;
  };

  const runLogin = async (nextEmail: string, nextPassword: string) => {
    setFormError(null);
    setLoading(true);
    persistInvite();
    try {
      await login(nextEmail, nextPassword);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('auth:login.failed');
      setFormError(message || t('auth:login.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!validate()) return;
    await runLogin(email, password);
  };

  const handleDemoLogin = async (user: TestUser) => {
    setEmail(user.email);
    setPassword(user.password);
    setEmailError(undefined);
    setPasswordError(undefined);
    await runLogin(user.email, user.password);
  };

  return (
    <AuthScreen title={t('auth:login.title')} subtitle={t('auth:login.subtitle')}>
      {passwordReset && !formError ? <AuthAlert tone="success" message={t('auth:login.resetSuccess')} /> : null}
      {formError ? <AuthAlert message={formError} /> : null}

      <AuthSocialButtons onBeforeContinue={persistInvite} />

      <View style={authLinkStyles.divider}>
        <View style={authLinkStyles.dividerLine} />
        <Text style={authLinkStyles.dividerText}>{t('auth:login.orEmail')}</Text>
        <View style={authLinkStyles.dividerLine} />
      </View>

      <AuthTextField
        label={t('common:email')}
        placeholder={t('auth:login.emailPlaceholder')}
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setEmailError(undefined);
        }}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        editable={!loading}
        leftIcon="mail-outline"
        error={emailError}
      />
      <AuthTextField
        label={t('auth:login.passwordLabel')}
        placeholder={t('auth:login.passwordPlaceholder')}
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setPasswordError(undefined);
        }}
        secureTextEntry
        showPasswordToggle
        autoComplete="password"
        textContentType="password"
        editable={!loading}
        leftIcon="lock-closed-outline"
        error={passwordError}
        labelRight={
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} disabled={loading}>
            <Text style={authLinkStyles.accent}>{t('auth:login.forgotPassword')}</Text>
          </TouchableOpacity>
        }
      />

      <View style={authLinkStyles.actions}>
        <AuthButton title={t('auth:login.button')} onPress={() => void handleLogin()} loading={loading} />
      </View>

      <TouchableOpacity
        onPress={() =>
          navigation.navigate('Register', {
            token: route.params?.token,
            code: route.params?.code,
            email: route.params?.email || email.trim() || undefined,
          })
        }
        style={authLinkStyles.row}
        disabled={loading}
      >
        <Text style={authLinkStyles.muted}>
          {t('auth:login.noAccount')} <Text style={authLinkStyles.accent}>{t('auth:login.registerLink')}</Text>
        </Text>
      </TouchableOpacity>

      {showDemoLogin() ? <AuthDemoPicker loading={loading} onSelect={(user) => void handleDemoLogin(user)} /> : null}

      <Text style={authLinkStyles.legal}>
        <Text onPress={() => navigation.navigate('Legal', { kind: 'privacy' })} style={authLinkStyles.accent}>
          {t('auth:login.privacy')}
        </Text>
        {' · '}
        <Text onPress={() => navigation.navigate('Legal', { kind: 'terms' })} style={authLinkStyles.accent}>
          {t('auth:login.terms')}
        </Text>
      </Text>
    </AuthScreen>
  );
};

export default LoginScreen;

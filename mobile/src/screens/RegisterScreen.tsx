import React, { useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { rememberInviteIntent, readInviteIntent } from '../utils/inviteIntent';
import { setPendingInviteToken } from '../utils/pendingInvite';
import AuthScreen, { authLinkStyles } from '../components/auth/AuthScreen';
import AuthTextField from '../components/auth/AuthTextField';
import AuthButton from '../components/auth/AuthButton';
import AuthAlert from '../components/auth/AuthAlert';
import AuthSocialButtons from '../components/auth/AuthSocialButtons';
import AuthInviteOption from '../components/auth/AuthInviteOption';
import { AuthStackParamList } from '../navigation/types';

const MIN_PASSWORD_LENGTH = 8;
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;
type Route = RouteProp<AuthStackParamList, 'Register'>;
type FieldKey = 'firstName' | 'email' | 'password' | 'confirmPassword' | 'inviteCode';

const RegisterScreen = () => {
  const { register } = useAuth();
  const { t } = useTranslation(['auth', 'common']);
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(route.params?.email?.trim() || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(route.params?.code || '');
  const [showInvite, setShowInvite] = useState(Boolean(route.params?.code || route.params?.token));
  const [showEmailForm, setShowEmailForm] = useState(Boolean(route.params?.code || route.params?.token));
  const [accountStep, setAccountStep] = useState<'you' | 'password'>('you');
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasInviteIntent = Boolean(route.params?.token || route.params?.code || inviteCode.trim());

  useEffect(() => {
    void (async () => {
      const stored = await rememberInviteIntent({
        token: route.params?.token,
        code: route.params?.code || inviteCode.trim() || undefined,
        email: route.params?.email,
        name: route.params?.name,
      });
      if (stored.code && !inviteCode) setInviteCode(stored.code);
      if (stored.email && !email.trim()) setEmail(stored.email);
      if (route.params?.email?.trim() && !email.trim()) setEmail(route.params.email.trim());
      if (stored.token || stored.code || route.params?.token || route.params?.code) {
        setShowInvite(true);
        setShowEmailForm(true);
      }
    })();
  }, [route.params?.token, route.params?.code, route.params?.email, route.params?.name]);

  const persistInvite = () => {
    void rememberInviteIntent({
      token: route.params?.token,
      code: inviteCode.trim() || route.params?.code,
      email: route.params?.email || email.trim() || undefined,
      name: route.params?.name,
    });
  };

  const openInvitePath = () => {
    setShowInvite(true);
    setShowEmailForm(true);
    setAccountStep('you');
    persistInvite();
  };

  const openEmailPath = () => {
    setShowEmailForm(true);
    setAccountStep('you');
  };

  const validate = (): Partial<Record<FieldKey, string>> => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!firstName.trim()) next.firstName = t('auth:register.firstNameRequired');
    if (!email.trim()) next.email = t('auth:register.emailRequired');
    else if (!isValidEmail(email)) next.email = t('auth:register.emailInvalid');
    if (!password) next.password = t('auth:register.passwordRequired');
    else if (password.length < MIN_PASSWORD_LENGTH) next.password = t('auth:register.passwordTooShort');
    if (!confirmPassword) next.confirmPassword = t('auth:register.passwordRequired');
    else if (password !== confirmPassword) next.confirmPassword = t('auth:register.passwordMismatch');
    return next;
  };

  const handleRegister = async () => {
    setFormError(null);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const code = inviteCode.trim();
    persistInvite();
    setLoading(true);
    try {
      await register({
        email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        inviteCode: code || undefined,
      });
      const intent = await readInviteIntent();
      if (intent?.token) setPendingInviteToken(intent.token);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('auth:register.failed');
      const lower = message.toLowerCase();
      const fieldErrors: Partial<Record<FieldKey, string>> = {};
      if (lower.includes('already') || lower.includes('exists') || lower.includes('υπάρχει')) {
        fieldErrors.email = t('auth:register.emailTaken');
      } else if (lower.includes('invite') || lower.includes('πρόσκλη')) {
        fieldErrors.inviteCode = t('auth:register.inviteInvalid');
        setShowInvite(true);
        setAccountStep('you');
      } else if (lower.includes('network') || lower.includes('failed to fetch')) {
        setFormError(t('auth:register.networkFailed'));
      } else {
        setFormError(message || t('auth:register.failed'));
      }
      setErrors(fieldErrors);
    } finally {
      setLoading(false);
    }
  };

  const goLogin = () =>
    navigation.navigate('Login', {
      token: route.params?.token,
      code: inviteCode.trim() || route.params?.code,
    });

  const heading = useMemo(() => {
    if (!showEmailForm) {
      return {
        eyebrow: undefined as string | undefined,
        title: t(hasInviteIntent ? 'auth:register.inviteTitle' : 'auth:register.title'),
        subtitle: t(hasInviteIntent ? 'auth:register.inviteSubtitle' : 'auth:register.subtitle'),
      };
    }
    if (accountStep === 'you') {
      return {
        eyebrow: t('auth:register.stepProgress', { current: 1, total: 2 }),
        title: t(hasInviteIntent ? 'auth:register.inviteTitle' : 'auth:register.stepYouTitle'),
        subtitle: t(hasInviteIntent ? 'auth:register.inviteSubtitle' : 'auth:register.stepYouSubtitle'),
      };
    }
    return {
      eyebrow: t('auth:register.stepProgress', { current: 2, total: 2 }),
      title: t('auth:register.stepPasswordTitle'),
      subtitle: t('auth:register.stepPasswordSubtitle'),
    };
  }, [accountStep, hasInviteIntent, showEmailForm, t]);

  return (
    <AuthScreen
      variant="register"
      eyebrow={heading.eyebrow}
      title={heading.title}
      subtitle={heading.subtitle}
    >
      {formError ? <AuthAlert message={formError} /> : null}
      {errors.email === t('auth:register.emailTaken') ? (
        <TouchableOpacity onPress={goLogin} style={authLinkStyles.row}>
          <Text style={authLinkStyles.accent}>{t('auth:register.loginLink')}</Text>
        </TouchableOpacity>
      ) : null}

      {!showEmailForm ? (
        <>
          <AuthSocialButtons onBeforeContinue={persistInvite} />
          <Text style={authLinkStyles.legal}>
            {t('auth:register.legalPrefix')}{' '}
            <Text onPress={() => navigation.navigate('Legal', { kind: 'terms' })} style={authLinkStyles.accent}>
              {t('auth:login.terms')}
            </Text>{' '}
            {t('auth:register.legalAnd')}{' '}
            <Text onPress={() => navigation.navigate('Legal', { kind: 'privacy' })} style={authLinkStyles.accent}>
              {t('auth:login.privacy')}
            </Text>
            .
          </Text>

          <View style={authLinkStyles.actions}>
            <AuthButton
              title={t('auth:register.continueWithEmail')}
              variant="outline"
              icon="mail-outline"
              onPress={openEmailPath}
            />
            <AuthInviteOption onPress={openInvitePath} disabled={loading} />
          </View>
        </>
      ) : accountStep === 'you' ? (
        <>
          {showInvite ? (
            <AuthTextField
              label={t('auth:register.inviteCode')}
              placeholder={t('auth:register.inviteCodePlaceholder')}
              value={inviteCode}
              onChangeText={(value) => {
                setInviteCode(value.toUpperCase());
                setErrors((prev) => ({ ...prev, inviteCode: undefined }));
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
              leftIcon="ticket-outline"
              optional
              helperText={t('auth:register.inviteCodeHint')}
              error={errors.inviteCode}
            />
          ) : (
            <View style={{ marginBottom: 12 }}>
              <AuthInviteOption onPress={() => setShowInvite(true)} disabled={loading} />
            </View>
          )}

          <AuthTextField
            label={t('auth:register.firstName')}
            placeholder={t('auth:register.firstNamePlaceholder')}
            value={firstName}
            onChangeText={setFirstName}
            autoComplete="given-name"
            textContentType="givenName"
            editable={!loading}
            leftIcon="person-outline"
            required
            error={errors.firstName}
          />
          <AuthTextField
            label={t('auth:register.lastName')}
            placeholder={t('auth:register.lastNamePlaceholder')}
            value={lastName}
            onChangeText={setLastName}
            autoComplete="family-name"
            textContentType="familyName"
            editable={!loading}
            leftIcon="person-outline"
            optional
          />
          <AuthTextField
            label={t('common:email')}
            placeholder={t('auth:login.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            editable={!loading}
            leftIcon="mail-outline"
            required
            error={errors.email}
          />

          <View style={authLinkStyles.actions}>
            <AuthButton
              title={t('auth:register.nextStep')}
              icon="arrow-forward"
              iconPosition="right"
              onPress={() => {
                const next: Partial<Record<FieldKey, string>> = {};
                if (!firstName.trim()) next.firstName = t('auth:register.firstNameRequired');
                if (!email.trim()) next.email = t('auth:register.emailRequired');
                else if (!isValidEmail(email)) next.email = t('auth:register.emailInvalid');
                setErrors(next);
                if (Object.keys(next).length === 0) setAccountStep('password');
              }}
            />
            <AuthButton
              title={t('common:back')}
              variant="ghost"
              onPress={() => {
                setShowEmailForm(false);
                setAccountStep('you');
              }}
              disabled={loading}
            />
          </View>
        </>
      ) : (
        <>
          <AuthTextField
            label={t('auth:login.passwordLabel')}
            placeholder={t('auth:register.passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            showPasswordToggle
            autoComplete="password-new"
            textContentType="newPassword"
            editable={!loading}
            leftIcon="lock-closed-outline"
            required
            helperText={t('auth:register.passwordHint')}
            error={errors.password}
          />
          <AuthTextField
            label={t('auth:register.confirmPassword')}
            placeholder={t('auth:register.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            showPasswordToggle
            autoComplete="password-new"
            textContentType="newPassword"
            editable={!loading}
            leftIcon="lock-closed-outline"
            required
            error={errors.confirmPassword}
          />

          <Text style={authLinkStyles.legal}>
            {t('auth:register.legalPrefix')}{' '}
            <Text onPress={() => navigation.navigate('Legal', { kind: 'terms' })} style={authLinkStyles.accent}>
              {t('auth:login.terms')}
            </Text>{' '}
            {t('auth:register.legalAnd')}{' '}
            <Text onPress={() => navigation.navigate('Legal', { kind: 'privacy' })} style={authLinkStyles.accent}>
              {t('auth:login.privacy')}
            </Text>
            .
          </Text>

          <View style={authLinkStyles.actions}>
            <AuthButton
              title={t(hasInviteIntent ? 'auth:register.inviteButton' : 'auth:register.button')}
              onPress={() => void handleRegister()}
              loading={loading}
            />
            <AuthButton
              title={t('common:back')}
              variant="ghost"
              onPress={() => setAccountStep('you')}
              disabled={loading}
            />
          </View>
        </>
      )}

      <TouchableOpacity onPress={goLogin} style={authLinkStyles.row} disabled={loading}>
        <Text style={authLinkStyles.muted}>
          {t('auth:register.hasAccount')} <Text style={authLinkStyles.accent}>{t('auth:register.loginLink')}</Text>
        </Text>
      </TouchableOpacity>
    </AuthScreen>
  );
};

export default RegisterScreen;

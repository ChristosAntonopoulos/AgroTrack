import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { usePreferences, AppLanguage } from '../context/PreferencesContext';
import BrandLogo from '../components/ui/BrandLogo';
import AuthTextField from '../components/auth/AuthTextField';
import { typography, spacing, spacingPatterns } from '../theme';
import { loginTheme } from '../theme/loginTheme';
import { AuthStackParamList } from '../navigation/types';

const loginBg = require('../../assets/images/login-bg.jpg');
const MIN_PASSWORD_LENGTH = 8;

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const UserIcon = () => <Text style={styles.fieldIcon}>👤</Text>;
const FieldIcon = () => <Text style={styles.fieldIcon}>✉</Text>;
const LockIcon = () => <Text style={styles.fieldIcon}>🔒</Text>;

const RegisterScreen = () => {
  const { register } = useAuth();
  const { language, setLanguage } = usePreferences();
  const { t } = useTranslation(['auth', 'common']);
  const navigation = useNavigation<Nav>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const isLoading = Boolean(loading);

  const handleRegister = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      Alert.alert(t('auth:register.failed'), t('auth:register.missingFields'));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert(t('auth:register.failed'), t('auth:register.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('auth:register.failed'), t('auth:register.passwordMismatch'));
      return;
    }
    try {
      setLoading(true);
      await register({ email, password, firstName, lastName });
    } catch (error: any) {
      Alert.alert(t('auth:register.failed'), error.message || t('auth:register.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ImageBackground source={loginBg} style={styles.background} resizeMode="cover">
        <View style={styles.overlay} />
        <SafeAreaView style={styles.safe}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.hero}>
                <BrandLogo variant="stacked" tone="on-dark" size={64} />
              </View>

              <View style={styles.card}>
                <View style={styles.langRow}>
                  {([
                    { id: 'el' as AppLanguage, label: t('common:greek') },
                    { id: 'en' as AppLanguage, label: t('common:english') },
                  ]).map((lang) => (
                    <TouchableOpacity
                      key={lang.id}
                      onPress={() => setLanguage(lang.id)}
                      style={[styles.langBtn, language === lang.id && styles.langBtnActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: language === lang.id }}
                    >
                      <Text style={[styles.langText, language === lang.id && styles.langTextActive]}>
                        {lang.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.title}>{t('auth:register.title')}</Text>
                <Text style={styles.subtitle}>{t('auth:register.subtitle')}</Text>

                <View style={styles.nameRow}>
                  <View style={styles.nameField}>
                    <AuthTextField
                      label={t('auth:register.firstName')}
                      placeholder={t('auth:register.firstNamePlaceholder')}
                      value={firstName}
                      onChangeText={setFirstName}
                      autoComplete="given-name"
                      editable={!isLoading}
                      leftIcon={<UserIcon />}
                    />
                  </View>
                  <View style={styles.nameField}>
                    <AuthTextField
                      label={t('auth:register.lastName')}
                      placeholder={t('auth:register.lastNamePlaceholder')}
                      value={lastName}
                      onChangeText={setLastName}
                      autoComplete="family-name"
                      editable={!isLoading}
                      leftIcon={<UserIcon />}
                    />
                  </View>
                </View>

                <AuthTextField
                  label={t('auth:register.emailLabel')}
                  placeholder={t('auth:register.emailPlaceholder')}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!isLoading}
                  leftIcon={<FieldIcon />}
                />
                <AuthTextField
                  label={t('auth:register.passwordLabel')}
                  placeholder={t('auth:register.passwordPlaceholder')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  showPasswordToggle
                  autoComplete="password-new"
                  editable={!isLoading}
                  leftIcon={<LockIcon />}
                />
                <Text style={styles.hint}>{t('auth:register.passwordHint')}</Text>
                <AuthTextField
                  label={t('auth:register.confirmPassword')}
                  placeholder={t('auth:register.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  showPasswordToggle
                  autoComplete="password-new"
                  editable={!isLoading}
                  leftIcon={<LockIcon />}
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
                  onPress={handleRegister}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color={loginTheme.buttonText} />
                  ) : (
                    <Text style={styles.primaryBtnText}>{t('auth:register.button')}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  style={styles.loginLink}
                  disabled={isLoading}
                >
                  <Text style={styles.loginText}>
                    {t('auth:register.hasAccount')}{' '}
                    <Text style={styles.loginAccent}>{t('auth:register.loginLink')}</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  background: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 10, 4, 0.74)',
  },
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  logo: { marginBottom: spacing.sm },
  appName: {
    ...typography.styles.h2,
    color: loginTheme.heroText,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.5,
  },
  tagline: {
    ...typography.styles.bodySmall,
    color: loginTheme.heroMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: loginTheme.cardBg,
    borderRadius: spacingPatterns.borderRadius.xl,
    borderWidth: 1,
    borderColor: loginTheme.cardBorder,
    padding: spacing.lg,
    shadowColor: loginTheme.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  langRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  langBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: spacingPatterns.borderRadius.lg,
    borderWidth: 1,
    borderColor: loginTheme.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: loginTheme.inputBg,
  },
  langBtnActive: {
    borderColor: loginTheme.inputBorderFocused,
    backgroundColor: loginTheme.buttonBg,
  },
  langText: {
    ...typography.styles.bodySmall,
    color: loginTheme.textSecondary,
    fontWeight: typography.fontWeight.semibold,
  },
  langTextActive: {
    color: loginTheme.buttonText,
  },
  title: {
    ...typography.styles.h3,
    color: loginTheme.textPrimary,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.styles.bodySmall,
    color: loginTheme.textSecondary,
    marginBottom: spacing.lg,
  },
  nameRow: {
    flexDirection: 'column',
  },
  nameField: {
    flex: 1,
  },
  fieldIcon: {
    fontSize: 16,
    color: loginTheme.textMuted,
  },
  hint: {
    ...typography.styles.caption,
    color: loginTheme.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  primaryBtn: {
    backgroundColor: loginTheme.buttonBg,
    borderRadius: spacingPatterns.borderRadius.lg,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    ...typography.styles.button,
    color: loginTheme.buttonText,
    fontWeight: typography.fontWeight.semibold,
  },
  loginLink: { alignItems: 'center' },
  loginText: {
    ...typography.styles.bodySmall,
    color: loginTheme.textSecondary,
    textAlign: 'center',
  },
  loginAccent: {
    color: loginTheme.link,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default RegisterScreen;

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
import { mobileDemoUsers, TestUser } from '../services/mockUsers';
import { getApiConnectionInfo } from '../services/api';
import { isMockMode } from '../services/serviceFactory';
import BrandLogo from '../components/ui/BrandLogo';
import AuthTextField from '../components/auth/AuthTextField';
import UserCard from '../components/domain/UserCard';
import { typography, spacing, spacingPatterns } from '../theme';
import { loginTheme } from '../theme/loginTheme';
import { AuthStackParamList } from '../navigation/types';

const loginBg = require('../../assets/images/login-bg.png');

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const FieldIcon = () => <Text style={styles.fieldIcon}>✉</Text>;
const LockIcon = () => <Text style={styles.fieldIcon}>🔒</Text>;

const LoginScreen = () => {
  const { login } = useAuth();
  const { t } = useTranslation(['auth', 'common']);
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const isLoading = Boolean(loading);
  const apiInfo = __DEV__ ? getApiConnectionInfo() : null;

  const handleDemoLogin = async (user: TestUser) => {
    try {
      setLoading(true);
      setEmail(user.email);
      setPassword(user.password);
      await login(user.email, user.password);
    } catch (error: any) {
      Alert.alert(t('auth:login.failed'), error.message || t('auth:login.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('auth:login.failed'), t('auth:login.failed'));
      return;
    }
    try {
      setLoading(true);
      await login(email, password);
    } catch (error: any) {
      Alert.alert(t('auth:login.failed'), error.message || t('auth:login.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert(t('auth:login.googleLogin'), t('auth:login.googleComingSoon'));
  };

  const handleForgotPassword = () => {
    Alert.alert(t('auth:login.forgotPassword'), t('auth:login.forgotPasswordHint'));
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
                <BrandLogo size={80} rounded={false} style={styles.logo} />
                <Text style={styles.appName}>{t('auth:login.appName')}</Text>
                <Text style={styles.tagline}>{t('auth:login.platformTagline')}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.title}>{t('auth:login.title')}</Text>
                <Text style={styles.subtitle}>{t('auth:login.subtitle')}</Text>

                <AuthTextField
                  label={t('auth:login.emailLabel')}
                  placeholder={t('auth:login.emailPlaceholder')}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!isLoading}
                  leftIcon={<FieldIcon />}
                />
                <AuthTextField
                  label={t('auth:login.passwordLabel')}
                  placeholder={t('auth:login.passwordPlaceholder')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  showPasswordToggle
                  autoComplete="password"
                  editable={!isLoading}
                  leftIcon={<LockIcon />}
                />

                <TouchableOpacity
                  onPress={handleForgotPassword}
                  style={styles.forgotLink}
                  disabled={isLoading}
                >
                  <Text style={styles.forgotText}>{t('auth:login.forgotPassword')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color={loginTheme.buttonText} />
                  ) : (
                    <Text style={styles.primaryBtnText}>{t('auth:login.button')}</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{t('common:or')}</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.googleBtn}
                  onPress={handleGoogleLogin}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  <Text style={styles.googleMark}>G</Text>
                  <Text style={styles.googleText}>{t('auth:login.googleLogin')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate('Register')}
                  style={styles.registerLink}
                  disabled={isLoading}
                >
                  <Text style={styles.registerText}>
                    {t('auth:login.noAccount')}{' '}
                    <Text style={styles.registerAccent}>{t('auth:login.registerLink')}</Text>
                  </Text>
                </TouchableOpacity>
              </View>

              {__DEV__ ? (
                <View style={styles.demoSection}>
                  <Text style={styles.demoTitle}>{t('auth:login.demoTitle')}</Text>
                  <Text style={styles.demoHint}>
                    {isMockMode()
                      ? t('auth:login.demoHint')
                      : t('auth:login.demoHintBackend', { url: apiInfo?.url ?? '' })}
                  </Text>
                  <View style={styles.demoRow}>
                    {mobileDemoUsers.map((u) => (
                      <UserCard
                        key={u.userId}
                        user={u}
                        onPress={isLoading ? undefined : () => handleDemoLogin(u)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              <Text style={styles.version}>{t('auth:login.versionLabel')}</Text>
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
    backgroundColor: loginTheme.overlay,
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
  fieldIcon: {
    fontSize: 16,
    color: loginTheme.textMuted,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: spacing.base,
    marginTop: -spacing.xs,
  },
  forgotText: {
    ...typography.styles.bodySmall,
    color: loginTheme.link,
    fontWeight: typography.fontWeight.medium,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: loginTheme.divider,
  },
  dividerText: {
    ...typography.styles.caption,
    color: loginTheme.textMuted,
    textTransform: 'lowercase',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: loginTheme.googleBg,
    borderWidth: 1,
    borderColor: loginTheme.googleBorder,
    borderRadius: spacingPatterns.borderRadius.lg,
    minHeight: 52,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  googleMark: {
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    color: '#4285F4',
  },
  googleText: {
    ...typography.styles.button,
    color: loginTheme.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  registerLink: { alignItems: 'center' },
  registerText: {
    ...typography.styles.bodySmall,
    color: loginTheme.textSecondary,
    textAlign: 'center',
  },
  registerAccent: {
    color: loginTheme.link,
    fontWeight: typography.fontWeight.semibold,
  },
  demoSection: {
    marginTop: spacing.lg,
    padding: spacing.base,
    borderRadius: spacingPatterns.borderRadius.lg,
    backgroundColor: loginTheme.demoBg,
    borderWidth: 1,
    borderColor: loginTheme.cardBorder,
  },
  demoTitle: {
    ...typography.styles.body,
    color: loginTheme.textPrimary,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  demoHint: {
    ...typography.styles.caption,
    color: loginTheme.textSecondary,
    marginBottom: spacing.md,
  },
  demoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  version: {
    ...typography.styles.caption,
    color: loginTheme.heroMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});

export default LoginScreen;

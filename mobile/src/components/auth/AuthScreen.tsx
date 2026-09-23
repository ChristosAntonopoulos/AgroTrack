import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import BrandLogo from '../ui/BrandLogo';
import AuthLangSwitch from './AuthLangSwitch';
import { loginTheme } from '../../theme/loginTheme';
import { typography, spacing } from '../../theme';

const loginBg = require('../../../assets/images/auth-left-bg.jpg');
const registerBg = require('../../../assets/images/auth-register-bg.jpg');

type Props = {
  variant?: 'login' | 'register';
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const AuthScreen: React.FC<Props> = ({ variant = 'login', title, subtitle, children }) => {
  const { t } = useTranslation('auth');
  const isRegister = variant === 'register';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ImageBackground
        source={isRegister ? registerBg : loginBg}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={[styles.overlay, isRegister && styles.overlayRegister]} />
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
              <View style={styles.chrome}>
                <AuthLangSwitch />
              </View>

              <View style={styles.hero}>
                <BrandLogo variant="stacked" tone="on-dark" size={isRegister ? 64 : 72} />
              </View>

              <View style={styles.card}>
                <View style={styles.brandRow}>
                  <BrandLogo variant="mark" tone="on-light" size={28} />
                  <Text style={styles.wordmark}>{t('login.appName')}</Text>
                </View>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
                {children}
              </View>

              <Text style={styles.belief}>
                {t(isRegister ? 'register.heroTitle' : 'login.heroTitle')}
              </Text>
              <View style={styles.security}>
                <Ionicons name="shield-checkmark-outline" size={14} color={loginTheme.heroMuted} />
                <Text style={styles.securityText}>{t('login.securityNote')}</Text>
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
    backgroundColor: loginTheme.overlay,
  },
  overlayRegister: {
    backgroundColor: loginTheme.overlayRegister,
  },
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },
  chrome: {
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: loginTheme.cardBg,
    borderRadius: loginTheme.cardRadius,
    borderWidth: 1,
    borderColor: loginTheme.cardBorder,
    padding: spacing.lg,
    shadowColor: loginTheme.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  wordmark: {
    ...typography.styles.label,
    color: loginTheme.textPrimary,
    letterSpacing: 1.4,
    fontWeight: '800',
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
  belief: {
    ...typography.styles.bodySmall,
    color: loginTheme.heroText,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 22,
  },
  security: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  securityText: {
    ...typography.styles.caption,
    color: loginTheme.heroMuted,
  },
});

export default AuthScreen;

export const authLinkStyles = StyleSheet.create({
  row: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  muted: {
    ...typography.styles.bodySmall,
    color: loginTheme.textSecondary,
    textAlign: 'center',
  },
  accent: {
    color: loginTheme.link,
    fontWeight: typography.fontWeight.semibold,
  },
  legal: {
    ...typography.styles.caption,
    color: loginTheme.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: loginTheme.divider,
  },
  dividerText: {
    ...typography.styles.caption,
    color: loginTheme.textMuted,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/ui/Button';
import { typography, spacing } from '../theme';
import { AuthStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SessionExpired'>;

const SessionExpiredScreen = () => {
  const { colors } = useTheme();
  const { t } = useTranslation('auth');
  const navigation = useNavigation<Nav>();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('sessionExpired.title')}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{t('sessionExpired.message')}</Text>
      <Button title={t('sessionExpired.button')} onPress={() => navigation.navigate('Login')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  icon: { fontSize: 48, marginBottom: spacing.lg },
  title: { ...typography.styles.h2, fontWeight: '700', marginBottom: spacing.sm, textAlign: 'center' },
  message: { ...typography.styles.body, textAlign: 'center', marginBottom: spacing.xl },
});

export default SessionExpiredScreen;

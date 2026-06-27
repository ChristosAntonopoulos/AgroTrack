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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import FormField from '../components/forms/FormField';
import Button from '../components/ui/Button';
import { typography, spacing } from '../theme';
import { AuthStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen = () => {
  const { register } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('auth');
  const navigation = useNavigation<Nav>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'FieldOwner' | 'Producer'>('Producer');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert(t('register.failed'));
      return;
    }
    try {
      setLoading(true);
      await register({ email, password, firstName, lastName, role });
    } catch (error: any) {
      Alert.alert(t('register.failed'), error.message || t('register.failed'));
    } finally {
      setLoading(false);
    }
  };

  const RoleOption = ({ value, label }: { value: 'FieldOwner' | 'Producer'; label: string }) => (
    <TouchableOpacity
      onPress={() => setRole(value)}
      style={[
        styles.roleOption,
        {
          backgroundColor: role === value ? colors.primary + '20' : colors.background,
          borderColor: role === value ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={[styles.roleText, { color: role === value ? colors.primary : colors.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('register.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('register.subtitle')}</Text>

          <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <FormField label={t('register.firstName')} value={firstName} onChangeText={setFirstName} editable={!loading} />
            <FormField label={t('register.lastName')} value={lastName} onChangeText={setLastName} editable={!loading} />
            <FormField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
            <FormField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            <Text style={[styles.roleLabel, { color: colors.textPrimary }]}>Role</Text>
            <View style={styles.roleRow}>
              <RoleOption value="FieldOwner" label={t('register.roleOwner')} />
              <RoleOption value="Producer" label={t('register.roleProducer')} />
            </View>

            <Button title={t('register.button')} onPress={handleRegister} loading={loading} fullWidth style={styles.submitBtn} />

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
              <Text style={[styles.loginText, { color: colors.textSecondary }]}>
                {t('register.hasAccount')}{' '}
                <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('register.loginLink')}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing.lg },
  title: { ...typography.styles.h2, fontWeight: '700', marginBottom: spacing.xs },
  subtitle: { ...typography.styles.body, marginBottom: spacing.lg },
  card: { borderRadius: 16, padding: spacing.lg, borderWidth: 1 },
  roleLabel: { ...typography.styles.bodySmall, fontWeight: '600', marginBottom: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  roleOption: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  roleText: { ...typography.styles.bodySmall, fontWeight: '600', textAlign: 'center' },
  submitBtn: { marginTop: spacing.sm },
  loginLink: { marginTop: spacing.lg, alignItems: 'center' },
  loginText: { ...typography.styles.bodySmall },
});

export default RegisterScreen;

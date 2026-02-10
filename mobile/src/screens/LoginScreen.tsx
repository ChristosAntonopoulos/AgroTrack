import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { testUsers, TestUser } from '../services/mockUsers';
import FormField from '../components/forms/FormField';
import Button from '../components/ui/Button';
import UserCard from '../components/domain/UserCard';
import { colors, typography, spacing } from '../theme';
import { toBoolean, toBooleanNot } from '../utils/booleanConverter';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TestUser | null>(null);
  
  // Convert loading for native components (Button, Input)
  const isLoading: boolean = toBoolean(loading);

  const handleUserSelect = (user: TestUser) => {
    setSelectedUser(user);
    setEmail(user.email);
    setPassword(user.password);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.header}>
          <Text style={styles.title}>Olive Lifecycle</Text>
          <Text style={styles.subtitle}>Platform</Text>
        </View>

        <View style={styles.userSelector}>
          <Text style={styles.sectionTitle}>Select User Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.userCardsContainer}
          >
            {testUsers.map((user) => (
              <UserCard
                key={user.userId}
                user={user}
                selected={selectedUser?.userId === user.userId}
                onPress={() => handleUserSelect(user)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.form}>
          <FormField
            label="Email"
            placeholder="Enter email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={toBooleanNot(isLoading, 'LoginScreen.editable')}
          />

          <FormField
            label="Password"
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
            showPasswordToggle={true}
            autoCapitalize="none"
            autoCorrect={false}
            editable={toBooleanNot(isLoading, 'LoginScreen.editable')}
          />

          <Button
            title={isLoading ? 'Logging in...' : 'Login'}
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
            style={styles.loginButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Select a user type above to auto-fill credentials
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.base,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing['3xl'],
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.styles.h1,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  subtitle: {
    ...typography.styles.h4,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  userSelector: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.styles.h5,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    fontWeight: typography.fontWeight.semibold,
  },
  userCardsContainer: {
    paddingVertical: spacing.sm,
  },
  form: {
    marginTop: spacing.lg,
  },
  loginButton: {
    marginTop: spacing.lg,
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});

export default LoginScreen;

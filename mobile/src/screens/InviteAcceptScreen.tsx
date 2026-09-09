import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { fieldPeopleService, FieldInvite } from '../services/fieldPeopleService';
import { setPendingInviteToken } from '../utils/pendingInvite';
import { AuthStackParamList, RootStackParamList } from '../navigation/types';
import { spacing, typography } from '../theme';

type Route = RouteProp<RootStackParamList & AuthStackParamList, 'InviteAccept'>;
type Nav = NativeStackNavigationProp<RootStackParamList & AuthStackParamList>;

const InviteAcceptScreen = () => {
  const { t } = useTranslation(['fields', 'common', 'auth']);
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const token = route.params?.token;
  const [invite, setInvite] = useState<FieldInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('fields:people.inviteMissing'));
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        setInvite(await fieldPeopleService.getInvite(token));
      } catch {
        setError(t('fields:people.inviteMissing'));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, t]);

  const accept = async () => {
    if (!token) return;
    if (!isAuthenticated) {
      setPendingInviteToken(token);
      navigation.navigate('Login');
      return;
    }
    setAccepting(true);
    try {
      await fieldPeopleService.acceptInvite(token);
      navigation.navigate('Partners', { fieldId: invite?.fieldId });
    } catch {
      setError(t('fields:people.inviteAcceptFailed'));
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScreenLayout padded>
      <ScreenHeader title={t('fields:people.inviteAcceptTitle')} />
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      {invite ? (
        <View style={styles.body}>
          <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
            {t('fields:people.inviteAcceptBody', {
              field: invite.fieldName,
              capacities: (invite.capacities || []).join(', '),
            })}
          </Text>
          <Button
            title={t('fields:people.acceptInvite')}
            onPress={() => void accept()}
            loading={accepting}
            fullWidth
          />
        </View>
      ) : (
        <Button title={t('auth:login.title')} onPress={() => navigation.navigate('Login')} />
      )}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  error: { ...typography.styles.body, marginBottom: spacing.md },
  body: { gap: spacing.md },
  bodyText: { ...typography.styles.body, lineHeight: 22 },
});

export default InviteAcceptScreen;

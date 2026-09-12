import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { OwnerPartnerInviteShare, ownerPartnerService } from '../services/ownerPartnerService';
import { setPendingPartnerInviteToken } from '../utils/pendingInvite';
import { AuthStackParamList, RootStackParamList } from '../navigation/types';
import { qrImageUrl } from '../utils/shareHelpers';
import { spacing, typography } from '../theme';

type Route = RouteProp<RootStackParamList & AuthStackParamList, 'PartnerInviteAccept'>;
type Nav = NativeStackNavigationProp<RootStackParamList & AuthStackParamList>;

const PartnerInviteAcceptScreen = () => {
  const { t } = useTranslation(['partners', 'common', 'auth']);
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const token = route.params?.token;
  const [invite, setInvite] = useState<OwnerPartnerInviteShare | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('partners:ownerPartner.inviteMissing'));
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const next = await ownerPartnerService.getInvite(token);
        setInvite(next);
        if (next.status && next.status.toLowerCase() !== 'pending') {
          setError(t('errors:inviteNoLongerValid', { defaultValue: t('partners:ownerPartner.inviteMissing') }));
        }
      } catch {
        setError(t('partners:ownerPartner.inviteMissing'));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, t]);

  const accept = async () => {
    if (!token) return;
    if (!isAuthenticated) {
      setPendingPartnerInviteToken(token);
      navigation.navigate('Login');
      return;
    }
    setAccepting(true);
    setError(null);
    try {
      await ownerPartnerService.acceptInvite(token);
      navigation.navigate('Partners');
    } catch {
      setError(t('partners:ownerPartner.acceptFailed'));
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const moduleLabels =
    invite?.modules?.map((m) => t(`partners:family.modules.${m}`)).join(', ') || '';
  const canAccept = invite?.status?.toLowerCase() === 'pending';

  return (
    <ScreenLayout padded>
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      {invite ? (
        <View style={styles.body}>
          <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
            {invite.ownerDisplayName
              ? t('partners:ownerPartner.acceptBody', {
                  owner: invite.ownerDisplayName,
                  modules: moduleLabels,
                })
              : t('partners:ownerPartner.acceptBodyFallback')}
          </Text>
          {invite.shareUrl ? (
            <Image
              source={{ uri: qrImageUrl(invite.shareUrl) }}
              style={styles.qr}
              accessibilityLabel={t('partners:ownerPartner.qrAlt')}
            />
          ) : null}
          {isAuthenticated ? (
            canAccept ? (
              <Button
                title={t('partners:ownerPartner.accept')}
                onPress={() => void accept()}
                loading={accepting}
                fullWidth
              />
            ) : (
              <Button
                title={t('partners:openInPartners')}
                onPress={() => navigation.navigate('Partners')}
                fullWidth
              />
            )
          ) : (
            <>
              <Button title={t('auth:register.button')} onPress={() => navigation.navigate('Register')} fullWidth />
              <Button
                title={t('auth:login.title')}
                variant="outline"
                onPress={() => {
                  setPendingPartnerInviteToken(token!);
                  navigation.navigate('Login');
                }}
                fullWidth
              />
            </>
          )}
        </View>
      ) : !error ? (
        <Button title={t('auth:login.title')} onPress={() => navigation.navigate('Login')} />
      ) : null}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  error: { ...typography.styles.body, marginBottom: spacing.md },
  body: { gap: spacing.md },
  bodyText: { ...typography.styles.body, lineHeight: 22 },
  qr: { width: 220, height: 220, alignSelf: 'center', borderRadius: 12 },
});

export default PartnerInviteAcceptScreen;

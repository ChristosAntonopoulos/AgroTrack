import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Image, Linking } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Button from '../components/ui/Button';
import InviteAcceptFrame from '../components/auth/InviteAcceptFrame';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { FamilyInviteShare, familyService } from '../services/familyService';
import { setPendingFamilyInviteToken } from '../utils/pendingInvite';
import { AuthStackParamList, RootStackParamList } from '../navigation/types';
import { typography } from '../theme';

type Route = RouteProp<RootStackParamList & AuthStackParamList, 'FamilyInviteAccept'>;
type Nav = NativeStackNavigationProp<RootStackParamList & AuthStackParamList>;

const qrUrl = (data: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`;

const FamilyInviteAcceptScreen = () => {
  const { t } = useTranslation(['partners', 'common', 'auth']);
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const token = route.params?.token;
  const [invite, setInvite] = useState<FamilyInviteShare | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('partners:family.inviteMissing'));
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        setInvite(await familyService.getInvite(token));
      } catch {
        setError(t('partners:family.inviteMissing'));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, t]);

  const accept = async () => {
    if (!token) return;
    if (!isAuthenticated) {
      setPendingFamilyInviteToken(token);
      navigation.navigate('Login');
      return;
    }
    setAccepting(true);
    try {
      await familyService.acceptInvite(token);
      navigation.navigate('Partners');
    } catch {
      setError(t('partners:family.acceptFailed'));
    } finally {
      setAccepting(false);
    }
  };

  const moduleLabels =
    invite?.modules?.map((m) => t(`partners:family.modules.${m}`)).join(', ') || '';

  return (
    <InviteAcceptFrame
      loading={loading}
      error={error}
      loginLabel={t('auth:login.title')}
      onLogin={() => navigation.navigate('Login')}
    >
      {invite ? (
        <>
          <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
            {invite.ownerDisplayName
              ? t('partners:family.acceptBody', {
                  owner: invite.ownerDisplayName,
                  modules: moduleLabels,
                })
              : t('partners:family.acceptBodyFallback')}
          </Text>
          {invite.shareUrl ? (
            <Image
              source={{ uri: qrUrl(invite.shareUrl) }}
              style={styles.qr}
              accessibilityLabel={t('partners:family.qrAlt')}
            />
          ) : null}
          <Button
            title={t('partners:family.accept')}
            onPress={() => void accept()}
            loading={accepting}
            fullWidth
          />
          {invite.whatsAppUrl ? (
            <Button
              title={t('partners:shareWhatsApp')}
              variant="outline"
              onPress={() => void Linking.openURL(invite.whatsAppUrl)}
              fullWidth
            />
          ) : null}
        </>
      ) : undefined}
    </InviteAcceptFrame>
  );
};

const styles = StyleSheet.create({
  bodyText: { ...typography.styles.body, lineHeight: 22 },
  qr: { width: 220, height: 220, alignSelf: 'center', borderRadius: 12 },
});

export default FamilyInviteAcceptScreen;

import React, { useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Button from '../components/ui/Button';
import InviteAcceptFrame from '../components/auth/InviteAcceptFrame';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { fieldPeopleService, FieldInvite, FieldModule } from '../services/fieldPeopleService';
import { setPendingInviteToken } from '../utils/pendingInvite';
import { rememberInviteIntent, clearInviteIntent } from '../utils/inviteIntent';
import { mapInviteLifecycle } from '../components/partners/inviteLifecycle';
import { AuthStackParamList, RootStackParamList } from '../navigation/types';
import { spacing, typography } from '../theme';

const PICKABLE_MODULES: FieldModule[] = ['fields', 'tasks', 'photos', 'money', 'chronologio', 'harvest'];

type Route = RouteProp<RootStackParamList & AuthStackParamList, 'InviteAccept'>;
type Nav = NativeStackNavigationProp<RootStackParamList & AuthStackParamList>;

const emailsMatch = (left?: string | null, right?: string | null) => {
  if (!left || !right) return true;
  return left.trim().toLowerCase() === right.trim().toLowerCase();
};

const InviteAcceptScreen = () => {
  const { t } = useTranslation(['fields', 'partners', 'common', 'auth']);
  const { colors } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const token = route.params?.token;
  const [invite, setInvite] = useState<FieldInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [alreadyHasAccess, setAlreadyHasAccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('fields:people.inviteMissing'));
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const next = await fieldPeopleService.getInvite(token);
        setInvite(next);
        await rememberInviteIntent({
          token: next.token || token,
          code: next.code,
          email: next.email,
          name: next.displayName,
        });
      } catch {
        setError(t('fields:people.inviteMissing'));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, t]);

  useEffect(() => {
    if (!isAuthenticated || !invite?.fieldId) return;
    let cancelled = false;
    void (async () => {
      try {
        const access = await fieldPeopleService.getAccessContext();
        if (cancelled) return;
        const seat = access.fields.find((field) => field.fieldId === invite.fieldId);
        if (seat) {
          setAlreadyHasAccess(true);
          if (mapInviteLifecycle(invite.status) === 'accepted') setAccepted(true);
        }
      } catch {
        /* keep invitation card */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, invite?.fieldId, invite?.status]);

  const expired = useMemo(() => {
    if (!invite) return false;
    if (mapInviteLifecycle(invite.status) === 'expired') return true;
    if (!invite.expiresAt) return false;
    return Date.parse(invite.expiresAt) < Date.now();
  }, [invite]);

  const lifecycle = mapInviteLifecycle(invite?.status);
  const revoked = lifecycle === 'revoked';
  const usedBySomeoneElse =
    lifecycle === 'accepted' &&
    isAuthenticated &&
    !alreadyHasAccess &&
    !accepted &&
    Boolean(invite?.acceptedBy) &&
    invite?.acceptedBy !== user?.id;
  const acceptedByThisUser =
    accepted ||
    alreadyHasAccess ||
    (lifecycle === 'accepted' && isAuthenticated && (!invite?.acceptedBy || invite.acceptedBy === user?.id));
  const wrongAccount =
    isAuthenticated &&
    Boolean(invite?.email) &&
    !emailsMatch(invite?.email, user?.email) &&
    !acceptedByThisUser;

  const roleLabel = invite
    ? invite.role === 'Partner'
      ? t('partners:connection.partnerSeat')
      : invite.role === 'Family'
        ? t('partners:connection.family')
        : invite.role
    : '';

  const moduleLabels = (invite?.modules || [])
    .filter((module) => PICKABLE_MODULES.includes(module))
    .map((module) => t(`partners:family.modules.${module}`, { defaultValue: module }));

  const actionSummary = invite
    ? invite.accessLevel === 'work'
      ? t('fields:people.inviteActionWork', { defaultValue: t('partners:family.levels.work') })
      : invite.accessLevel === 'help'
        ? t('fields:people.inviteActionHelp', { defaultValue: t('partners:family.levels.help') })
        : t('fields:people.inviteActionView', { defaultValue: t('partners:family.levels.view') })
    : '';

  const inviter = invite?.invitedByName || invite?.invitedBy;
  const fieldName = invite?.fieldName || '';
  const success = acceptedByThisUser;

  const goAuth = (screen: 'Login' | 'Register') => {
    const intentToken = invite?.token || token;
    if (intentToken) setPendingInviteToken(intentToken);
    void rememberInviteIntent({
      token: intentToken,
      code: invite?.code,
      email: invite?.email,
      name: invite?.displayName,
    });
    const params = { token: intentToken, code: invite?.code, email: invite?.email };
    const names = navigation.getState()?.routeNames || [];
    if (names.includes('Login')) {
      navigation.navigate(screen, params);
      return;
    }
    navigation.navigate('Auth', { screen, params });
  };

  const accept = async () => {
    if (!token) return;
    if (!isAuthenticated) {
      goAuth('Login');
      return;
    }
    setAccepting(true);
    try {
      await fieldPeopleService.acceptInvite(token);
      await clearInviteIntent();
      setAccepted(true);
      setAlreadyHasAccess(true);
    } catch {
      setError(t('fields:people.inviteAcceptFailed'));
    } finally {
      setAccepting(false);
    }
  };

  const openField = () => {
    void clearInviteIntent();
    if (invite?.fieldId) {
      navigation.navigate('Chronologio', { fieldId: invite.fieldId });
      return;
    }
    navigation.navigate('Main', { screen: 'ChronologioTab' });
  };

  const loginOnFrame = () => goAuth('Login');

  return (
    <InviteAcceptFrame
      loading={loading}
      error={error}
      loginLabel={t('auth:login.button')}
      onLogin={loginOnFrame}
    >
      {invite ? (
        <>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {success
              ? t('fields:people.inviteAcceptedTitle', { field: fieldName, defaultValue: fieldName })
              : inviter
                ? t('fields:people.inviteHeadline', { name: inviter, field: fieldName })
                : t('fields:people.inviteHeadlineFallback', { field: fieldName })}
          </Text>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>
            {success
              ? t('fields:people.inviteAcceptedBody', { field: fieldName })
              : t('fields:people.inviteAccessIntro', {
                  modules: moduleLabels.join(', ') || roleLabel,
                  action: actionSummary,
                })}
          </Text>

          <View style={styles.facts}>
            <Text style={{ color: colors.textSecondary }}>{t('fields:people.inviteFrom')}</Text>
            <Text style={{ color: colors.textPrimary }}>{inviter || '—'}</Text>
            <Text style={{ color: colors.textSecondary }}>{t('fields:people.inviteField')}</Text>
            <Text style={{ color: colors.textPrimary }}>{fieldName}</Text>
            <Text style={{ color: colors.textSecondary }}>{t('fields:people.inviteRole')}</Text>
            <Text style={{ color: colors.textPrimary }}>{roleLabel}</Text>
            <Text style={{ color: colors.textSecondary }}>{t('partners:family.partsTitle')}</Text>
            <Text style={{ color: colors.textPrimary }}>{moduleLabels.join(', ') || '—'}</Text>
          </View>

          {success ? (
            <Button title={t('fields:people.openField')} onPress={openField} />
          ) : revoked ? (
            <Text style={{ color: colors.error }}>{t('fields:people.inviteRevoked')}</Text>
          ) : expired ? (
            <Text style={{ color: colors.error }}>{t('fields:people.inviteExpiredExplain')}</Text>
          ) : usedBySomeoneElse ? (
            <Text style={{ color: colors.error }}>{t('fields:people.inviteUsed')}</Text>
          ) : wrongAccount ? (
            <>
              <Text style={{ color: colors.textSecondary }}>
                {t('fields:people.wrongAccount', {
                  email: user?.email || '',
                  inviteEmail: invite.email || '',
                })}
              </Text>
              <Button
                title={t('fields:people.switchAccount')}
                onPress={() => {
                  void rememberInviteIntent({
                    token: invite.token || token,
                    code: invite.code,
                    email: invite.email,
                    name: invite.displayName,
                  });
                  void logout();
                }}
              />
            </>
          ) : isAuthenticated ? (
            <>
              <Button
                title={t('fields:people.acceptInvite')}
                loading={accepting}
                onPress={() => void accept()}
              />
              <Button title={t('fields:people.declineInvite')} variant="ghost" onPress={() => navigation.navigate('Main', { screen: 'ChronologioTab' })} />
            </>
          ) : invite.inviteeHasAccount ? (
            <>
              <Text style={{ color: colors.textSecondary }}>
                {t('fields:people.inviteExistingAccountHint', {
                  defaultValue: 'You already have an Oleachron account. Sign in to accept.',
                })}
              </Text>
              <Button title={t('fields:people.inviteSignIn')} onPress={() => goAuth('Login')} />
              <Button
                title={t('fields:people.inviteCreateAccount')}
                variant="ghost"
                onPress={() => goAuth('Register')}
              />
            </>
          ) : (
            <>
              <Button title={t('fields:people.inviteCreateAccount')} onPress={() => goAuth('Register')} />
              <Button
                title={t('fields:people.inviteSignIn')}
                variant="outline"
                onPress={() => goAuth('Login')}
              />
            </>
          )}
        </>
      ) : null}
    </InviteAcceptFrame>
  );
};

const styles = StyleSheet.create({
  title: { ...typography.styles.h3, fontWeight: '800' },
  lead: { ...typography.styles.body, lineHeight: 22 },
  facts: { gap: spacing.xs, marginVertical: spacing.sm },
});

export default InviteAcceptScreen;

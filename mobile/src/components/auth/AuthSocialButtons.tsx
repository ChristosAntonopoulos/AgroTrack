import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { readInviteIntent } from '../../utils/inviteIntent';
import { loginTheme } from '../../theme/loginTheme';
import GoogleGIcon from './GoogleGIcon';

WebBrowser.maybeCompleteAuthSession();

type Props = {
  onBeforeContinue?: () => void;
};

const webClientId = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '').trim();
const iosClientId = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '').trim();
const androidClientId = (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '').trim();
const googleConfigured = Boolean(webClientId || iosClientId || androidClientId);

const AuthSocialButtons: React.FC<Props> = ({ onBeforeContinue }) => {
  const { t } = useTranslation('auth');
  const { loginWithGoogle } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const handledResponse = useRef<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: webClientId || undefined,
    iosClientId: iosClientId || undefined,
    androidClientId: androidClientId || undefined,
    webClientId: webClientId || undefined,
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === 'error') {
      setNotice(t('register.googleFailed'));
      setBusy(false);
      return;
    }

    if (response.type === 'dismiss' || response.type === 'cancel') {
      setBusy(false);
      return;
    }

    if (response.type !== 'success') return;

    const idToken =
      response.params.id_token ||
      (response as { authentication?: { idToken?: string | null } }).authentication?.idToken ||
      undefined;

    const responseKey = idToken || JSON.stringify(response.params);
    if (handledResponse.current === responseKey) return;
    handledResponse.current = responseKey;

    if (!idToken) {
      setNotice(t('register.googleFailed'));
      setBusy(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const invite = await readInviteIntent();
        await loginWithGoogle(idToken, invite?.code);
      } catch (error: unknown) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : t('register.googleFailed');
          setNotice(message || t('register.googleFailed'));
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [response, loginWithGoogle, t]);

  const handlePress = async () => {
    onBeforeContinue?.();
    setNotice(null);

    if (!googleConfigured) {
      setNotice(t('register.googleNotConfigured'));
      return;
    }

    handledResponse.current = null;
    setBusy(true);
    try {
      await promptAsync();
    } catch {
      setNotice(t('register.googleFailed'));
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.button, busy && styles.buttonBusy]}
        onPress={() => void handlePress()}
        disabled={busy || (googleConfigured && !request)}
        accessibilityRole="button"
      >
        {busy ? (
          <ActivityIndicator color={loginTheme.textPrimary} />
        ) : (
          <>
            <GoogleGIcon size={20} />
            <Text style={styles.label}>{t('register.continueGoogle')}</Text>
          </>
        )}
      </TouchableOpacity>
      {notice ? (
        <Text style={styles.note} accessibilityRole="text">
          {notice}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  button: {
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: loginTheme.googleBorder,
    backgroundColor: loginTheme.googleBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    shadowColor: loginTheme.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  buttonBusy: {
    opacity: 0.7,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: loginTheme.textPrimary,
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    color: loginTheme.textSecondary,
  },
});

export default AuthSocialButtons;

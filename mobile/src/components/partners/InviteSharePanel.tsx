import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { copyText, nativeShare, qrImageUrl } from '../../utils/shareHelpers';
import { spacing, typography } from '../../theme';

export type ShareableInvite = {
  code?: string;
  displayName?: string;
  phone?: string;
  shareUrl: string;
  whatsAppUrl?: string;
  mailtoUrl?: string;
  smsUrl?: string;
};

type Props = {
  invite: ShareableInvite;
  /** i18n key group under partners: — family or ownerPartner */
  copyNs?: 'family' | 'ownerPartner';
  onDone?: () => void;
};

const InviteSharePanel: React.FC<Props> = ({ invite, copyNs = 'family', onDone }) => {
  const { t } = useTranslation(['partners', 'common']);
  const { colors } = useTheme();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const code = invite.code?.trim();
  const ns = `partners:${copyNs}`;

  const handleCopyCode = async () => {
    if (!code) return;
    const ok = await copyText(code);
    setCopied(ok ? 'code' : null);
  };

  const handleCopyLink = async () => {
    const ok = await copyText(invite.shareUrl);
    setCopied(ok ? 'link' : null);
  };

  const handleNative = async () => {
    const text = code
      ? t(`${ns}.shareMessageWithCode`, {
          name: invite.displayName || '',
          code,
          defaultValue: t(`${ns}.shareMessage`, {
            name: invite.displayName || '',
            defaultValue: invite.shareUrl,
          }),
        })
      : t(`${ns}.shareMessage`, {
          name: invite.displayName || '',
          defaultValue: invite.shareUrl,
        });
    await nativeShare(t(`${ns}.shareTitle`, { defaultValue: 'Oleachron invite' }), text, invite.shareUrl);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{t(`${ns}.inviteReady`)}</Text>
      {code ? (
        <View
          style={[
            styles.codeBox,
            {
              borderColor: colors.oliveBorder,
              backgroundColor: colors.primaryLight,
              borderStyle: 'dashed',
            },
          ]}
        >
          <Text style={[styles.codeLabel, { color: colors.primary }]}>{t(`${ns}.inviteCode`)}</Text>
          <Text style={[styles.codeValue, { color: colors.textPrimary }]}>{code}</Text>
          <Text style={[styles.codeHint, { color: colors.textSecondary }]}>{t(`${ns}.inviteCodeHint`)}</Text>
          <Button
            title={copied === 'code' ? t(`${ns}.codeCopied`) : t(`${ns}.copyCode`)}
            variant="outline"
            onPress={() => void handleCopyCode()}
          />
        </View>
      ) : null}
      {invite.shareUrl ? (
        <Image
          source={{ uri: qrImageUrl(invite.shareUrl) }}
          style={[styles.qr, { borderColor: colors.border }]}
          accessibilityLabel={t(`${ns}.qrAlt`)}
        />
      ) : null}
      {invite.shareUrl ? (
        <Text style={[styles.link, { color: colors.primary }]} numberOfLines={2}>
          {invite.shareUrl}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button title={t(`${ns}.nativeShare`, { defaultValue: t('common:share', { defaultValue: 'Share' }) })} onPress={() => void handleNative()} />
        {invite.whatsAppUrl ? (
          <Button title={t('partners:shareWhatsApp')} onPress={() => void Linking.openURL(invite.whatsAppUrl!)} />
        ) : null}
        {invite.mailtoUrl ? (
          <Button
            title={t(`${ns}.shareEmail`)}
            variant="outline"
            onPress={() => void Linking.openURL(invite.mailtoUrl!)}
          />
        ) : null}
        {invite.phone && invite.smsUrl ? (
          <Button title={t('partners:text')} variant="outline" onPress={() => void Linking.openURL(invite.smsUrl!)} />
        ) : null}
        <Button
          title={copied === 'link' ? t(`${ns}.linkCopied`) : t('partners:copyLink', { defaultValue: 'Copy link' })}
          variant="outline"
          onPress={() => void handleCopyLink()}
        />
        {onDone ? <Button title={t('common:close')} variant="outline" onPress={onDone} /> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  hint: { ...typography.styles.body },
  codeBox: {
    borderWidth: 2,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
  },
  codeLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  codeValue: { fontSize: 32, fontWeight: '800', letterSpacing: 3, textAlign: 'center' },
  codeHint: { fontSize: 13, marginBottom: spacing.xs, textAlign: 'center' },
  qr: {
    width: 220,
    height: 220,
    alignSelf: 'center',
    borderRadius: 16,
    borderWidth: 1,
  },
  link: { fontSize: 13, textAlign: 'center' },
  actions: { gap: spacing.sm },
});

export default InviteSharePanel;

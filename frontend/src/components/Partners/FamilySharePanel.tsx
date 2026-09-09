import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import { FamilyInviteShare } from '../../services/familyService';
import { canNativeShare, copyText, nativeShare, qrImageUrl } from '../../utils/shareHelpers';

type Props = {
  invite: FamilyInviteShare;
  onDone?: () => void;
};

const FamilySharePanel: React.FC<Props> = ({ invite, onDone }) => {
  const { t } = useTranslation(['partners', 'common']);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const code = invite.code?.trim();

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
      ? t('partners:family.shareMessageWithCode', { name: invite.displayName || '', code })
      : t('partners:family.shareMessage', { name: invite.displayName || '' });
    await nativeShare(t('partners:family.shareTitle'), text, invite.shareUrl);
  };

  return (
    <div className="family-share-panel">
      <p className="partners-inline-hint">{t('partners:family.inviteReady')}</p>
      {code ? (
        <div className="family-invite-code">
          <span className="family-invite-code-label">{t('partners:family.inviteCode')}</span>
          <strong className="family-invite-code-value">{code}</strong>
          <p className="family-invite-code-hint">{t('partners:family.inviteCodeHint')}</p>
          <Button variant="outline" onClick={() => void handleCopyCode()}>
            {copied === 'code' ? t('partners:family.codeCopied') : t('partners:family.copyCode')}
          </Button>
        </div>
      ) : null}
      <div className="family-qr-wrap">
        <img
          className="family-qr"
          src={qrImageUrl(invite.shareUrl, 220)}
          alt={t('partners:family.qrAlt')}
          width={220}
          height={220}
        />
      </div>
      <a className="partner-invite-link" href={invite.shareUrl} target="_blank" rel="noreferrer">
        {invite.shareUrl}
      </a>
      <div className="partners-sheet-actions family-share-actions">
        {canNativeShare() ? (
          <Button onClick={() => void handleNative()}>{t('partners:family.nativeShare')}</Button>
        ) : null}
        <a className="btn btn-primary btn-md" href={invite.whatsAppUrl} target="_blank" rel="noreferrer">
          {t('partners:shareWhatsApp')}
        </a>
        <a className="btn btn-outline btn-md" href={invite.mailtoUrl}>
          {t('partners:family.shareEmail')}
        </a>
        {invite.phone ? (
          <a className="btn btn-outline btn-md" href={invite.smsUrl}>
            {t('partners:text')}
          </a>
        ) : null}
        <Button variant="outline" onClick={() => void handleCopyLink()}>
          {copied === 'link' ? t('partners:family.linkCopied') : t('partners:copyLink')}
        </Button>
        {onDone ? (
          <Button variant="ghost" onClick={onDone}>
            {t('common:close')}
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default FamilySharePanel;

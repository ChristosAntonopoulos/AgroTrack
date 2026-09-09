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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyText(invite.shareUrl);
    setCopied(ok);
  };

  const handleNative = async () => {
    await nativeShare(
      t('partners:family.shareTitle'),
      t('partners:family.shareMessage', { name: invite.displayName || '' }),
      invite.shareUrl
    );
  };

  return (
    <div className="family-share-panel">
      <p className="partners-inline-hint">{t('partners:family.inviteReady')}</p>
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
        <Button variant="outline" onClick={() => void handleCopy()}>
          {copied ? t('partners:family.linkCopied') : t('partners:copyLink')}
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

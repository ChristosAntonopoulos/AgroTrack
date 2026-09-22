import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import { FieldInvite } from '../../services/fieldPeopleService';
import { canNativeShare, copyText, nativeShare, qrImageUrl } from '../../utils/shareHelpers';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import { mapInviteLifecycle } from './inviteLifecycle';

type Props = {
  invite: FieldInvite;
  /** i18n key group under partners: — family or ownerPartner */
  copyNs?: 'family' | 'ownerPartner';
  onDone?: () => void;
};

const FamilySharePanel: React.FC<Props> = ({ invite, copyNs = 'family', onDone }) => {
  const { t } = useTranslation(['partners', 'common']);
  const { formatDate } = useLocaleFormatters();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const code = invite.code?.trim();
  const ns = `partners:${copyNs}`;
  const lifecycle = mapInviteLifecycle(invite.status);
  const expired =
    lifecycle === 'expired' ||
    (Boolean(invite.expiresAt) && Date.parse(invite.expiresAt) < Date.now());

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
      ? t(`${ns}.shareMessageWithCode`, { name: invite.displayName || '', code })
      : t(`${ns}.shareMessage`, { name: invite.displayName || '' });
    await nativeShare(t(`${ns}.shareTitle`), text, invite.shareUrl);
  };

  return (
    <div className="family-share-panel">
      <p className="partners-inline-hint">{t(`${ns}.inviteReady`)}</p>
      <div className="partner-chips family-invite-status-row">
        <span className="partner-chip">
          {t(`partners:inviteLifecycle.${expired && lifecycle === 'pending' ? 'expired' : lifecycle}`)}
        </span>
        {invite.expiresAt ? (
          <span className="partner-chip partner-chip-job">
            {t('partners:inviteExpiresOn', { date: formatDate(invite.expiresAt) })}
          </span>
        ) : null}
      </div>
      {code ? (
        <div className="family-invite-code">
          <span className="family-invite-code-label">{t(`${ns}.inviteCode`)}</span>
          <strong className="family-invite-code-value">{code}</strong>
          <p className="family-invite-code-hint">{t(`${ns}.inviteCodeHint`)}</p>
          <Button variant="outline" onClick={() => void handleCopyCode()}>
            {copied === 'code' ? t(`${ns}.codeCopied`) : t(`${ns}.copyCode`)}
          </Button>
        </div>
      ) : null}
      {invite.shareUrl ? (
        <div className="family-qr-wrap">
          <img
            className="family-qr"
            src={qrImageUrl(invite.shareUrl, 220)}
            alt={t(`${ns}.qrAlt`)}
            width={220}
            height={220}
          />
        </div>
      ) : null}
      <a className="partner-invite-link" href={invite.shareUrl} target="_blank" rel="noreferrer">
        {invite.shareUrl}
      </a>
      <div className="partners-sheet-actions family-share-actions">
        {invite.mailtoUrl ? (
          <a className="btn btn-primary btn-md" href={invite.mailtoUrl}>
            {t(`${ns}.shareEmail`)}
          </a>
        ) : invite.email ? (
          <a
            className="btn btn-primary btn-md"
            href={`mailto:${encodeURIComponent(invite.email)}?subject=${encodeURIComponent(
              t(`${ns}.shareTitle`)
            )}&body=${encodeURIComponent(invite.shareUrl)}`}
          >
            {t(`${ns}.shareEmail`)}
          </a>
        ) : null}
        <Button variant="outline" onClick={() => void handleCopyLink()}>
          {copied === 'link' ? t(`${ns}.linkCopied`) : t('partners:copyLink')}
        </Button>
        {canNativeShare() ? (
          <Button variant="outline" onClick={() => void handleNative()}>
            {t(`${ns}.nativeShare`)}
          </Button>
        ) : null}
        <a className="btn btn-outline btn-md" href={invite.whatsAppUrl} target="_blank" rel="noreferrer">
          {t('partners:shareWhatsApp')}
        </a>
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

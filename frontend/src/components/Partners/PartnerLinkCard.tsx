import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../Common/Card';
import Button from '../Common/Button';
import PhoneActions from './PhoneActions';
import PartnersSheet from './PartnersSheet';
import FamilySharePanel from './FamilySharePanel';
import FamilyAccessFields from './FamilyAccessFields';
import { FamilyAccessLevel, FamilyModule } from '../../services/familyService';
import { OwnerPartnerLink, ownerPartnerService } from '../../services/ownerPartnerService';
import { getApiErrorMessage } from '../../utils/translateApiError';
import { useDrawerPresence } from '../../hooks/useDrawerPresence';
import '../../pages/PartnersPage.css';

type Props = {
  link: OwnerPartnerLink;
  canManage?: boolean;
  onChanged?: () => void;
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const PartnerLinkCard: React.FC<Props> = ({ link, canManage, onChanged }) => {
  const { t } = useTranslation(['partners', 'common']);
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const editDrawer = useDrawerPresence(editing);
  const shareDrawer = useDrawerPresence(sharing);
  const [name, setName] = useState(link.displayName);
  const [phone, setPhone] = useState(link.phone || '');
  const [email, setEmail] = useState(link.email || '');
  const [modules, setModules] = useState<FamilyModule[]>([...link.modules]);
  const [accessLevel, setAccessLevel] = useState<FamilyAccessLevel>(link.accessLevel);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checklistItems = [
    { key: 'hasContact', ok: link.checklist.hasContact },
    { key: 'inviteSent', ok: link.checklist.inviteSent },
    { key: 'accepted', ok: link.checklist.accepted },
    { key: 'hasModules', ok: link.checklist.hasModules },
    { key: 'canCallOrMessage', ok: link.checklist.canCallOrMessage },
  ] as const;

  const openEdit = () => {
    setName(link.displayName);
    setPhone(link.phone || '');
    setEmail(link.email || '');
    setModules([...link.modules]);
    setAccessLevel(link.accessLevel);
    setError(null);
    setEditing(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await ownerPartnerService.updateLink(link.id, {
        displayName: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        modules,
        accessLevel,
      });
      setEditing(false);
      onChanged?.();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  const revoke = async () => {
    if (!window.confirm(t('partners:ownerPartner.revokeConfirm', { name: link.displayName }))) return;
    await ownerPartnerService.revokeLink(link.id);
    onChanged?.();
  };

  return (
    <>
      <Card className="partner-person-card family-member-card">
        <div className="partner-person-main">
          <div className="partner-person-identity">
            <span className="partner-avatar" aria-hidden>
              {initials(link.displayName)}
            </span>
            <div className="partner-person-text">
              <h3>{link.displayName}</h3>
              {link.phone ? <p className="partner-person-phone">{link.phone}</p> : null}
              {link.email ? <p className="partner-person-phone">{link.email}</p> : null}
              {link.status === 'pending' && link.pendingInvite?.code ? (
                <p className="family-member-code">
                  {t('partners:ownerPartner.inviteCode')}: <strong>{link.pendingInvite.code}</strong>
                </p>
              ) : null}
            </div>
          </div>
          <div className="partner-chips">
            <span className="partner-chip partner-chip-family">{t('partners:connection.partnerSeat')}</span>
            <span className="partner-chip">
              {t(`partners:family.levels.${link.accessLevel}`)}
            </span>
            {link.status === 'pending' ? (
              <span className="partner-chip">{t('partners:connection.invited')}</span>
            ) : null}
            {link.modules.map((module) => (
              <span key={module} className="partner-chip partner-chip-job">
                {t(`partners:family.modules.${module}`)}
              </span>
            ))}
          </div>
          <ul className="family-checklist" aria-label={t('partners:ownerPartner.checklistTitle')}>
            {checklistItems.map((item) => (
              <li key={item.key} className={item.ok ? 'is-done' : ''}>
                <span aria-hidden>{item.ok ? '✓' : '○'}</span>
                {t(`partners:family.checklist.${item.key}`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="partner-actions-stack">
          <PhoneActions phone={link.phone} />
          <div className="partner-actions">
            {link.email ? (
              <a className="btn btn-outline btn-sm" href={`mailto:${link.email}`}>
                {t('partners:ownerPartner.shareEmail')}
              </a>
            ) : null}
            {canManage ? (
              <Button variant="outline" size="sm" onClick={openEdit}>
                {t('partners:ownerPartner.editAccess')}
              </Button>
            ) : null}
            {canManage && link.status === 'pending' && link.pendingInvite ? (
              <Button variant="outline" size="sm" onClick={() => setSharing(true)}>
                {t('partners:ownerPartner.reshare')}
              </Button>
            ) : null}
            {canManage ? (
              <Button variant="outline" size="sm" onClick={() => void revoke()}>
                {t('partners:ownerPartner.revoke')}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {editDrawer.mounted ? (
        <PartnersSheet
          open={editDrawer.open}
          title={t('partners:ownerPartner.editAccess')}
          subtitle={link.displayName}
          onClose={() => setEditing(false)}
        >
          <form className="partners-form family-invite-form" onSubmit={save}>
            <div className="family-form-section">
              <label>
                <span>{t('partners:inviteName')}</span>
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <div className="partners-form-row">
                <label>
                  <span>{t('partners:invitePhone')}</span>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </label>
                <label>
                  <span>{t('partners:inviteEmail')}</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
              </div>
            </div>
            <FamilyAccessFields
              modules={modules}
              accessLevel={accessLevel}
              radioName={`partner-level-${link.id}`}
              onToggleModule={(module) =>
                setModules((prev) =>
                  prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
                )
              }
              onSetLevel={setAccessLevel}
            />
            {error ? <div className="error-message">{error}</div> : null}
            <div className="partners-sheet-actions">
              <Button type="submit" loading={saving} disabled={!name.trim() || modules.length === 0}>
                {t('common:save')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                {t('common:cancel')}
              </Button>
            </div>
          </form>
        </PartnersSheet>
      ) : null}

      {shareDrawer.mounted && link.pendingInvite ? (
        <PartnersSheet
          open={shareDrawer.open}
          title={t('partners:ownerPartner.reshare')}
          subtitle={link.displayName}
          onClose={() => setSharing(false)}
        >
          <FamilySharePanel
            invite={{ ...link.pendingInvite, memberId: link.pendingInvite.linkId }}
            copyNs="ownerPartner"
            onDone={() => setSharing(false)}
          />
        </PartnersSheet>
      ) : null}
    </>
  );
};

export default PartnerLinkCard;

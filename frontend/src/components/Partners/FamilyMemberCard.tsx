import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../Common/Card';
import Button from '../Common/Button';
import PhoneActions from './PhoneActions';
import PartnersSheet from './PartnersSheet';
import FamilySharePanel from './FamilySharePanel';
import FamilyAccessFields from './FamilyAccessFields';
import {
  FamilyAccessLevel,
  FamilyMember,
  FamilyModule,
  familyService,
} from '../../services/familyService';
import { getApiErrorMessage } from '../../utils/translateApiError';
import { useDrawerPresence } from '../../hooks/useDrawerPresence';
import '../../pages/PartnersPage.css';

type Props = {
  member: FamilyMember;
  canManage?: boolean;
  onChanged?: () => void;
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const FamilyMemberCard: React.FC<Props> = ({ member, canManage, onChanged }) => {
  const { t } = useTranslation(['partners', 'common']);
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const editDrawer = useDrawerPresence(editing);
  const shareDrawer = useDrawerPresence(sharing);
  const [name, setName] = useState(member.displayName);
  const [phone, setPhone] = useState(member.phone || '');
  const [email, setEmail] = useState(member.email || '');
  const [modules, setModules] = useState<FamilyModule[]>([...member.modules]);
  const [accessLevel, setAccessLevel] = useState<FamilyAccessLevel>(member.accessLevel);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checklistItems = [
    { key: 'hasContact', ok: member.checklist.hasContact },
    { key: 'inviteSent', ok: member.checklist.inviteSent },
    { key: 'accepted', ok: member.checklist.accepted },
    { key: 'hasModules', ok: member.checklist.hasModules },
    { key: 'canCallOrMessage', ok: member.checklist.canCallOrMessage },
  ] as const;

  const openEdit = () => {
    setName(member.displayName);
    setPhone(member.phone || '');
    setEmail(member.email || '');
    setModules([...member.modules]);
    setAccessLevel(member.accessLevel);
    setError(null);
    setEditing(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await familyService.updateMember(member.id, {
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
    if (!window.confirm(t('partners:family.revokeConfirm', { name: member.displayName }))) return;
    await familyService.revokeMember(member.id);
    onChanged?.();
  };

  return (
    <>
      <Card className="partner-person-card family-member-card">
        <div className="partner-person-main">
          <div className="partner-person-identity">
            <span className="partner-avatar" aria-hidden>
              {initials(member.displayName)}
            </span>
            <div className="partner-person-text">
              <h3>{member.displayName}</h3>
              {member.phone ? <p className="partner-person-phone">{member.phone}</p> : null}
              {member.email ? <p className="partner-person-phone">{member.email}</p> : null}
              {member.status === 'pending' && member.pendingInvite?.code ? (
                <p className="family-member-code">
                  {t('partners:family.inviteCode')}: <strong>{member.pendingInvite.code}</strong>
                </p>
              ) : null}
            </div>
          </div>
          <div className="partner-chips">
            <span className="partner-chip partner-chip-family">{t('partners:connection.family')}</span>
            <span className="partner-chip">
              {t(`partners:family.levels.${member.accessLevel}`)}
            </span>
            {member.status === 'pending' ? (
              <span className="partner-chip">{t('partners:connection.invited')}</span>
            ) : null}
            {member.modules.map((module) => (
              <span key={module} className="partner-chip partner-chip-job">
                {t(`partners:family.modules.${module}`)}
              </span>
            ))}
          </div>
          <ul className="family-checklist" aria-label={t('partners:family.checklistTitle')}>
            {checklistItems.map((item) => (
              <li key={item.key} className={item.ok ? 'is-done' : ''}>
                <span aria-hidden>{item.ok ? '✓' : '○'}</span>
                {t(`partners:family.checklist.${item.key}`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="partner-actions-stack">
          <PhoneActions phone={member.phone} />
          <div className="partner-actions">
            {member.email ? (
              <a className="btn btn-outline btn-sm" href={`mailto:${member.email}`}>
                {t('partners:family.shareEmail')}
              </a>
            ) : null}
            {canManage ? (
              <Button variant="outline" size="sm" onClick={openEdit}>
                {t('partners:family.editAccess')}
              </Button>
            ) : null}
            {canManage && member.status === 'pending' && member.pendingInvite ? (
              <Button variant="outline" size="sm" onClick={() => setSharing(true)}>
                {t('partners:family.reshare')}
              </Button>
            ) : null}
            {canManage ? (
              <Button variant="outline" size="sm" onClick={() => void revoke()}>
                {t('partners:family.revoke')}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {editDrawer.mounted ? (
        <PartnersSheet
          open={editDrawer.open}
          title={t('partners:family.editAccess')}
          subtitle={member.displayName}
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
              radioName={`family-level-${member.id}`}
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

      {shareDrawer.mounted && member.pendingInvite ? (
        <PartnersSheet
          open={shareDrawer.open}
          title={t('partners:family.reshare')}
          subtitle={member.displayName}
          onClose={() => setSharing(false)}
        >
          <FamilySharePanel invite={member.pendingInvite} onDone={() => setSharing(false)} />
        </PartnersSheet>
      ) : null}
    </>
  );
};

export default FamilyMemberCard;

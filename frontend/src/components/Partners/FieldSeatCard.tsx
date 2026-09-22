import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../Common/Card';
import Button from '../Common/Button';
import PhoneActions from './PhoneActions';
import PartnersSheet from './PartnersSheet';
import FamilySharePanel from './FamilySharePanel';
import FamilyAccessFields from './FamilyAccessFields';
import {
  FieldAccessLevel,
  FieldInvite,
  FieldMembership,
  FieldModule,
  fieldPeopleService,
} from '../../services/fieldPeopleService';
import { getApiErrorMessage } from '../../utils/translateApiError';
import { useDrawerPresence } from '../../hooks/useDrawerPresence';
import { seatLifecycleLabelKey } from './inviteLifecycle';
import '../../pages/PartnersPage.css';

type Props = {
  fieldId: string;
  person: FieldMembership;
  canManage?: boolean;
  onChanged?: () => void;
  /** Optional pending invite share (shown after create in this session). */
  pendingInvite?: FieldInvite | null;
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const FieldSeatCard: React.FC<Props> = ({ fieldId, person, canManage, onChanged, pendingInvite }) => {
  const { t } = useTranslation(['partners', 'common']);
  const copyNs = person.role === 'Partner' ? 'ownerPartner' : 'family';
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const editDrawer = useDrawerPresence(editing);
  const shareDrawer = useDrawerPresence(sharing);
  const [modules, setModules] = useState<FieldModule[]>([...person.modules]);
  const [accessLevel, setAccessLevel] = useState<FieldAccessLevel>(person.accessLevel);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = person.displayName || person.email || person.userId || person.inviteId || '—';
  const lifecycle = seatLifecycleLabelKey(person.status);
  const isPending = lifecycle === 'pending';
  const canRemove =
    Boolean(canManage && person.role !== 'Admin' && person.userId);
  const invite = pendingInvite;

  const roleChip =
    person.role === 'Partner'
      ? t('partners:connection.partnerSeat')
      : person.role === 'Admin'
        ? t('partners:connection.owner')
        : t('partners:connection.family');

  const openEdit = () => {
    setModules([...person.modules]);
    setAccessLevel(person.accessLevel);
    setError(null);
    setEditing(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const targetId = person.userId || person.inviteId;
    if (!targetId) return;
    try {
      setSaving(true);
      setError(null);
      await fieldPeopleService.updatePerson(fieldId, targetId, {
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
    if (!person.userId) return;
    const confirmKey = isPending
      ? `partners:${copyNs}.cancelInviteConfirm`
      : `partners:${copyNs}.revokeConfirm`;
    if (!window.confirm(t(confirmKey, { name: displayName }))) return;
    await fieldPeopleService.removeMembership(fieldId, person.userId);
    onChanged?.();
  };

  return (
    <>
      <Card className="partner-person-card family-member-card">
        <div className="partner-person-main">
          <div className="partner-person-identity">
            <span className="partner-avatar" aria-hidden>
              {initials(displayName)}
            </span>
            <div className="partner-person-text">
              <h3>{displayName}</h3>
              {person.phone ? <p className="partner-person-phone">{person.phone}</p> : null}
              {person.email ? <p className="partner-person-phone">{person.email}</p> : null}
            </div>
          </div>
          <div className="partner-chips">
            <span className="partner-chip partner-chip-family">{roleChip}</span>
            {person.role !== 'Admin' ? (
              <span className="partner-chip">{t(`partners:inviteLifecycle.${lifecycle}`)}</span>
            ) : null}
            {person.role !== 'Admin' ? (
              <span className="partner-chip">{t(`partners:family.levels.${person.accessLevel}`)}</span>
            ) : null}
            {person.modules
              .filter((module) => module !== 'documents')
              .map((module) => (
                <span key={module} className="partner-chip partner-chip-job">
                  {t(`partners:family.modules.${module}`)}
                </span>
              ))}
          </div>
        </div>
        <div className="partner-actions-stack">
          <PhoneActions phone={person.phone} email={person.email} />
          <div className="partner-actions">
            {canManage && person.role !== 'Admin' && (person.userId || person.inviteId) ? (
              <Button variant="outline" size="sm" onClick={openEdit}>
                {t(`partners:${copyNs}.editAccess`)}
              </Button>
            ) : null}
            {canManage && invite ? (
              <Button variant="outline" size="sm" onClick={() => setSharing(true)}>
                {t(`partners:${copyNs}.reshare`)}
              </Button>
            ) : null}
            {canRemove ? (
              <Button variant="outline" size="sm" onClick={() => void revoke()}>
                {isPending ? t(`partners:${copyNs}.cancelInvite`) : t(`partners:${copyNs}.revoke`)}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {editDrawer.mounted ? (
        <PartnersSheet
          open={editDrawer.open}
          title={t(`partners:${copyNs}.editAccess`)}
          subtitle={displayName}
          onClose={() => setEditing(false)}
        >
          <form className="partners-form family-invite-form" onSubmit={save}>
            <FamilyAccessFields
              modules={modules}
              accessLevel={accessLevel}
              role={person.role === 'Partner' ? 'Partner' : 'Family'}
              radioName={`field-seat-${person.userId || person.inviteId}`}
              onToggleModule={(module) =>
                setModules((prev) =>
                  prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
                )
              }
              onSetLevel={setAccessLevel}
            />
            {error ? <div className="error-message">{error}</div> : null}
            <div className="partners-sheet-actions">
              <Button type="submit" loading={saving} disabled={modules.length === 0}>
                {t('common:save')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                {t('common:cancel')}
              </Button>
            </div>
          </form>
        </PartnersSheet>
      ) : null}

      {shareDrawer.mounted && invite ? (
        <PartnersSheet
          open={shareDrawer.open}
          title={t(`partners:${copyNs}.reshare`)}
          subtitle={displayName}
          onClose={() => setSharing(false)}
        >
          <FamilySharePanel
            invite={invite}
            copyNs={person.role === 'Partner' ? 'ownerPartner' : 'family'}
            onDone={() => setSharing(false)}
          />
        </PartnersSheet>
      ) : null}
    </>
  );
};

export default FieldSeatCard;

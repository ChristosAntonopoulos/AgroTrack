import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
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
import { moduleDiff, PICKABLE_MODULES, resolvedAccessLevel } from './accessPreview';
import '../../pages/PartnersPage.css';

type Props = {
  fieldId: string;
  fieldName?: string;
  fieldColor?: string;
  person: FieldMembership;
  canManage?: boolean;
  onChanged?: () => void;
  pendingInvite?: FieldInvite | null;
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const FieldSeatCard: React.FC<Props> = ({
  fieldId,
  fieldName,
  fieldColor,
  person,
  canManage,
  onChanged,
  pendingInvite,
}) => {
  const { t } = useTranslation(['partners', 'common']);
  const copyNs = person.role === 'Partner' ? 'ownerPartner' : 'family';
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [resending, setResending] = useState(false);
  const [workingInvite, setWorkingInvite] = useState<FieldInvite | null>(pendingInvite || null);
  const editDrawer = useDrawerPresence(editing);
  const shareDrawer = useDrawerPresence(sharing);
  const [modules, setModules] = useState<FieldModule[]>([...person.modules]);
  const [accessLevel, setAccessLevel] = useState<FieldAccessLevel>(person.accessLevel);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = person.displayName || person.email || person.userId || person.inviteId || '—';
  const lifecycle = seatLifecycleLabelKey(person.status);
  const isPending = lifecycle === 'pending' || lifecycle === 'expired';
  const targetId = person.userId || person.inviteId;
  const canRevoke = Boolean(canManage && person.role !== 'Admin' && targetId);
  const invite = workingInvite || pendingInvite || null;
  const shownLevel = resolvedAccessLevel(person.modules, person.accessLevel);

  const diff = useMemo(() => moduleDiff(person.modules, modules), [modules, person.modules]);
  const levelChanged = accessLevel !== person.accessLevel;
  const hasMaterialChange = diff.added.length > 0 || diff.removed.length > 0 || levelChanged;

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
    if (!targetId) return;
    const confirmMsg = fieldName
      ? t('partners:revokeAccessConfirm', { name: displayName, field: fieldName })
      : t(`partners:${copyNs}.revokeConfirm`, { name: displayName });
    if (!window.confirm(confirmMsg)) return;
    await fieldPeopleService.removeMembership(fieldId, targetId);
    onChanged?.();
  };

  const resend = async () => {
    const inviteId = invite?.id || person.inviteId;
    if (!inviteId) return;
    try {
      setResending(true);
      const next = await fieldPeopleService.resendInvite(fieldId, inviteId);
      setWorkingInvite(next);
      setSharing(true);
      onChanged?.();
    } catch (err: unknown) {
      window.alert(getApiErrorMessage(err, t));
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Card
        className="partner-person-card family-member-card"
        style={fieldColor ? ({ '--field-accent': fieldColor } as React.CSSProperties) : undefined}
      >
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
              <span className="partner-chip">{t(`partners:family.levels.${shownLevel}`)}</span>
            ) : null}
            {person.modules
              .filter((module) => PICKABLE_MODULES.includes(module))
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
            {canManage && isPending ? (
              <Button variant="primary" size="sm" loading={resending} onClick={() => void resend()}>
                {t('partners:resendInvite')}
              </Button>
            ) : canManage && person.role !== 'Admin' && targetId ? (
              <Button variant="outline" size="sm" onClick={openEdit}>
                {t(`partners:${copyNs}.editAccess`)}
              </Button>
            ) : null}
            {canRevoke ? (
              <Button variant="outline" size="sm" onClick={() => void revoke()}>
                {isPending ? t(`partners:${copyNs}.cancelInvite`) : t('partners:revokeAccess')}
              </Button>
            ) : null}
          </div>
          {canManage && !isPending && person.role !== 'Admin' && invite ? (
            <details className="partner-more">
              <summary>{t('partners:moreActions')}</summary>
              <div className="partner-actions">
                <Button variant="ghost" size="sm" onClick={() => setSharing(true)}>
                  {t(`partners:${copyNs}.reshare`)}
                </Button>
              </div>
            </details>
          ) : null}
        </div>
      </Card>

      {editDrawer.mounted ? (
        <PartnersSheet
          open={editDrawer.open}
          kicker={t('partners:accessEditorKicker')}
          title={t('partners:accessEditorTitle', { name: displayName })}
          subtitle={fieldName || undefined}
          icon={<ShieldCheck size={22} />}
          onClose={() => setEditing(false)}
          footerClassName="oa-drawer-footer--stack"
          footer={
            <>
              {hasMaterialChange ? (
                <p className="family-access-diff">
                  {diff.added.length > 0
                    ? t('partners:accessDiffAdded', {
                        list: diff.added.map((module) => t(`partners:family.modules.${module}`)).join(' · '),
                      })
                    : null}
                  {diff.added.length > 0 && diff.removed.length > 0 ? ' ' : null}
                  {diff.removed.length > 0
                    ? t('partners:accessDiffRemoved', {
                        list: diff.removed.map((module) => t(`partners:family.modules.${module}`)).join(' · '),
                      })
                    : null}
                  {levelChanged
                    ? ` ${t(`partners:family.levels.${shownLevel}`)} → ${t(
                        `partners:family.levels.${resolvedAccessLevel(modules, accessLevel)}`
                      )}`
                    : null}
                </p>
              ) : null}
              {error ? <div className="error-message">{error}</div> : null}
              <div className="partners-sheet-actions">
                <Button
                  type="submit"
                  form="field-access-form"
                  loading={saving}
                  disabled={modules.length === 0 || saving}
                >
                  {t('partners:saveAccess')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                  {t('common:cancel')}
                </Button>
              </div>
            </>
          }
        >
          <form id="field-access-form" className="partners-form family-invite-form" onSubmit={save}>
            <FamilyAccessFields
              modules={modules}
              accessLevel={accessLevel}
              role={person.role === 'Partner' ? 'Partner' : 'Family'}
              radioName={`field-seat-${person.userId || person.inviteId}`}
              previewMode="edit"
              onToggleModule={(module) =>
                setModules((prev) =>
                  prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
                )
              }
              onSetLevel={setAccessLevel}
            />
          </form>
        </PartnersSheet>
      ) : null}

      {shareDrawer.mounted && invite ? (
        <PartnersSheet
          open={shareDrawer.open}
          title={t('partners:resendInvite')}
          subtitle={fieldName ? t('partners:fieldContext', { field: fieldName }) : displayName}
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

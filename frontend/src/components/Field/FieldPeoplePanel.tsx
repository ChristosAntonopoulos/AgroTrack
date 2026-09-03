import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../Common/Card';
import Button from '../Common/Button';
import {
  fieldPeopleService,
  FieldCapacity,
  FieldMembership,
  FieldInvite,
  FieldPeopleStats,
  AdvisorComment,
} from '../../services/fieldPeopleService';
import { useAuth } from '../../context/AuthContext';
import { getUserService } from '../../services/serviceFactory';
import { User } from '../../services/userService';
import { useExperienceMode } from '../../context/ExperienceModeContext';
import './FieldPeoplePanel.css';

const CAPACITY_OPTIONS: FieldCapacity[] = ['own', 'work', 'advise', 'help', 'view'];

interface Props {
  fieldId: string;
  fieldName: string;
  canManage: boolean;
  canAdvise: boolean;
  compact?: boolean;
  initialMemberships?: FieldMembership[];
  initialComments?: AdvisorComment[];
}

const FieldPeoplePanel: React.FC<Props> = ({
  fieldId,
  fieldName,
  canManage,
  canAdvise,
  compact = false,
  initialMemberships = [],
  initialComments = [],
}) => {
  const { t } = useTranslation(['fields', 'common']);
  const { user } = useAuth();
  const { isFullPicture, showWidget } = useExperienceMode();
  const [people, setPeople] = useState<FieldMembership[]>(initialMemberships);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [capacities, setCapacities] = useState<FieldCapacity[]>(['work']);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [lastInvite, setLastInvite] = useState<FieldInvite | null>(null);
  const [stats, setStats] = useState<FieldPeopleStats | null>(null);
  const [comments, setComments] = useState<AdvisorComment[]>(initialComments);
  const [commentBody, setCommentBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [members, peopleStats] = await Promise.all([
        fieldPeopleService.getPeople(fieldId),
        isFullPicture && showWidget('peopleStats')
          ? fieldPeopleService.getStats(fieldId)
          : Promise.resolve(null),
      ]);
      setPeople(members);
      if (peopleStats) setStats(peopleStats);
    } catch (e: any) {
      setError(e?.message || 'Failed to load people');
    }
  };

  useEffect(() => {
    void load();
    if (canManage) {
      getUserService()
        .getUsers()
        .then(setUsers)
        .catch(() => setUsers([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId, canManage, isFullPicture]);

  const toggleCapacity = (capacity: FieldCapacity) => {
    setCapacities((prev) =>
      prev.includes(capacity) ? prev.filter((c) => c !== capacity) : [...prev, capacity]
    );
  };

  const handleUpsert = async () => {
    if (!selectedUserId || capacities.length === 0) return;
    await fieldPeopleService.upsertMembership(fieldId, selectedUserId, capacities);
    setSelectedUserId('');
    await load();
  };

  const handleRemove = async (userId: string) => {
    await fieldPeopleService.removeMembership(fieldId, userId);
    await load();
  };

  const handleInvite = async () => {
    const invite = await fieldPeopleService.createInvite(fieldId, {
      capacities,
      phone: invitePhone || undefined,
      displayName: inviteName || undefined,
    });
    setLastInvite(invite);
  };

  const handleComment = async () => {
    if (!commentBody.trim()) return;
    const comment = await fieldPeopleService.addAdvisorComment(fieldId, commentBody.trim());
    setComments((prev) => [...prev, comment]);
    setCommentBody('');
  };

  if (compact) {
    if (people.length <= 1) {
      return (
        <div className="people-strip people-strip-solo">
          {t('fields:people.youWorkThisField')}
        </div>
      );
    }
    return (
      <div className="people-strip">
        {people
          .map((p) => p.displayName || p.email || p.userId)
          .slice(0, 4)
          .join(' · ')}
      </div>
    );
  }

  return (
    <Card className="field-people-panel">
      <h2 className="field-people-title">{t('fields:people.title')}</h2>
      {error ? <p className="field-people-error">{error}</p> : null}
      <ul className="field-people-list">
        {people.map((person) => (
          <li key={person.userId} className="field-people-item">
            <div>
              <strong>{person.displayName || person.email || person.userId}</strong>
              <div className="field-people-caps">
                {person.capacities.map((c) => t(`fields:people.capacities.${c}`)).join(', ')}
              </div>
            </div>
            {canManage && person.userId !== user?.userId ? (
              <Button size="sm" variant="outline" onClick={() => handleRemove(person.userId)}>
                {t('common:remove')}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      {canManage ? (
        <div className="field-people-manage">
          <h3>{t('fields:people.addPerson')}</h3>
          <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
            <option value="">{t('fields:people.selectPerson')}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName || u.email} ({u.role})
              </option>
            ))}
          </select>
          <div className="field-people-capacity-grid">
            {CAPACITY_OPTIONS.map((capacity) => (
              <label key={capacity} className="field-people-capacity">
                <input
                  type="checkbox"
                  checked={capacities.includes(capacity)}
                  onChange={() => toggleCapacity(capacity)}
                />
                <span>
                  <strong>{t(`fields:people.capacities.${capacity}`)}</strong>
                  <small>{t(`fields:people.capacityHints.${capacity}`)}</small>
                </span>
              </label>
            ))}
          </div>
          <Button size="sm" variant="primary" onClick={handleUpsert} disabled={!selectedUserId}>
            {t('fields:people.savePerson')}
          </Button>

          <h3>{t('fields:people.inviteTitle')}</h3>
          <input
            type="text"
            placeholder={t('fields:people.inviteName')}
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
          />
          <input
            type="tel"
            placeholder={t('fields:people.invitePhone')}
            value={invitePhone}
            onChange={(e) => setInvitePhone(e.target.value)}
          />
          <Button size="sm" variant="secondary" onClick={handleInvite}>
            {t('fields:people.createInvite')}
          </Button>
          {lastInvite ? (
            <div className="field-people-invite-result">
              <a href={lastInvite.shareUrl} target="_blank" rel="noreferrer">
                {lastInvite.shareUrl}
              </a>
              <a href={lastInvite.whatsAppUrl} target="_blank" rel="noreferrer">
                {t('fields:people.shareWhatsApp')}
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      {isFullPicture && showWidget('peopleStats') && stats ? (
        <div className="field-people-stats">
          <h3>{t('fields:people.statsTitle')}</h3>
          <ul>
            {stats.people.map((p) => (
              <li key={p.userId}>
                <strong>{p.displayName || p.userId}</strong> — {t('fields:people.openTasks')}:{' '}
                {p.openTasks}, {t('fields:people.overdue')}: {p.overdueTasks},{' '}
                {t('fields:people.completed')}: {p.completedTasks}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {(canAdvise || showWidget('advisorComments')) && isFullPicture ? (
        <div className="field-people-comments">
          <h3>{t('fields:people.advisorComments')}</h3>
          <ul>
            {comments.map((c) => (
              <li key={c.id}>
                <strong>{c.displayName || c.userId}</strong>: {c.body}
              </li>
            ))}
          </ul>
          {canAdvise ? (
            <div className="field-people-comment-form">
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder={t('fields:people.commentPlaceholder', { field: fieldName })}
              />
              <Button size="sm" onClick={handleComment} disabled={!commentBody.trim()}>
                {t('fields:people.postComment')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
};

export default FieldPeoplePanel;

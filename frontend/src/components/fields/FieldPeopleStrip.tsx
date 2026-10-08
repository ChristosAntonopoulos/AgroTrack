import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Users } from 'lucide-react';
import { fieldPeopleService, type FieldMembership } from '../../services/fieldPeopleService';

type Props = {
  fieldId: string;
  /** Compact chips for list cards; rows for overview. */
  variant?: 'overview' | 'card';
};

const FieldPeopleStrip: React.FC<Props> = ({ fieldId, variant = 'overview' }) => {
  const { t } = useTranslation(['fields', 'partners']);
  const [people, setPeople] = useState<FieldMembership[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fieldPeopleService
      .getPeople(fieldId)
      .then((list) => {
        if (!cancelled) setPeople(list.filter((p) => p.status !== 'Revoked' && p.status !== 'Expired'));
      })
      .catch(() => {
        if (!cancelled) setPeople([]);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldId]);

  if (!people || people.length === 0) return null;

  const href = `/partners?fieldId=${encodeURIComponent(fieldId)}`;
  const names = people
    .map((p) => p.displayName || p.email || p.phone || t('partners:peoplePage.unnamed', { defaultValue: '—' }))
    .slice(0, variant === 'card' ? 3 : 8);

  if (variant === 'card') {
    return (
      <p className="field-card-people" title={names.join(', ')}>
        <Users size={13} strokeWidth={2.1} aria-hidden />
        <span>
          {people.length <= 3
            ? names.join(', ')
            : t('fields:overview.people.moreNames', {
                names: names.join(', '),
                count: people.length - 3,
                defaultValue: `${names.join(', ')} +${people.length - 3}`})}
        </span>
      </p>
    );
  }

  return (
    <section className="field-overview-people" aria-labelledby="field-overview-people-title">
      <div className="field-overview-section-head">
        <h2 id="field-overview-people-title">
          <Users size={18} strokeWidth={2} aria-hidden />
          {t('fields:overview.people.title')}
        </h2>
        <Link className="field-overview-cta field-overview-cta--ghost" to={href}>
          {t('fields:overview.people.manage')}
          <ChevronRight size={15} aria-hidden />
        </Link>
      </div>
      <ul className="field-overview-people-list">
        {people.slice(0, 6).map((person) => {
          const label =
            person.displayName || person.email || person.phone || t('partners:peoplePage.unnamed', { defaultValue: '—' });
          const roleLabel = t(`fields:card.role.${person.role}`, {
            defaultValue: person.role});
          return (
            <li key={`${person.userId}-${person.inviteId || ''}`}>
              <span className="field-overview-people-avatar" aria-hidden>
                {(label.trim().charAt(0) || '?').toUpperCase()}
              </span>
              <span className="field-overview-people-body">
                <strong>{label}</strong>
                <em>{roleLabel}</em>
              </span>
            </li>
          );
        })}
      </ul>
      {people.length > 6 ? (
        <Link className="field-overview-cta field-overview-cta--ghost" to={href}>
          {t('fields:overview.people.seeAll', {
            count: people.length})}
          <ChevronRight size={15} aria-hidden />
        </Link>
      ) : null}
    </section>
  );
};

export default FieldPeopleStrip;

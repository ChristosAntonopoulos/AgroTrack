import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Users } from 'lucide-react';
import Button from '../Common/Button';
import FamilyMemberCard from './FamilyMemberCard';
import { FamilyCircle } from '../../services/familyService';

type Props = {
  circle: FamilyCircle | null;
  loading?: boolean;
  canManage?: boolean;
  onAdd: () => void;
  onChanged: () => void;
};

const FamilySection: React.FC<Props> = ({ circle, loading, canManage, onAdd, onChanged }) => {
  const { t } = useTranslation(['partners']);
  const seatsUsed = circle?.seatsUsed ?? 0;
  const seatsMax = circle?.seatsMax ?? 2;
  const members = circle?.members ?? [];
  const canAdd = Boolean(canManage && seatsUsed < seatsMax);

  return (
    <section className="partners-section family-section" aria-labelledby="family-section-title">
      <div className="partners-section-head">
        <div>
          <h2 id="family-section-title">
            <Users size={20} aria-hidden />
            {t('partners:family.title')}
            {!loading && members.length > 0 ? (
              <span className="partners-count">{members.length}</span>
            ) : null}
          </h2>
          <p className="partners-lead">
            {t('partners:family.lead', { used: seatsUsed, max: seatsMax })}
          </p>
        </div>
        {canAdd ? (
          <Button onClick={onAdd} icon={<Plus size={18} aria-hidden />}>
            {t('partners:family.addMember')}
          </Button>
        ) : null}
      </div>

      {!loading && members.length === 0 ? (
        <div className="family-empty">
          <p className="partners-inline-hint">{t('partners:family.empty')}</p>
          {canManage ? (
            <Button variant="outline" onClick={onAdd} icon={<Plus size={18} aria-hidden />}>
              {t('partners:family.addMember')}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="partners-people-list">
        {members.map((member) => (
          <FamilyMemberCard
            key={member.id}
            member={member}
            canManage={canManage}
            onChanged={onChanged}
          />
        ))}
      </div>
    </section>
  );
};

export default FamilySection;

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Wheat } from 'lucide-react';
import { useHarvestCampaignOptional } from '../../context/HarvestCampaignContext';
import { useAuth } from '../../context/AuthContext';
import type { AppRole } from '../../navigation/navConfig';
import './HarvestHeaderButton.css';

const HARVEST_ROLES: AppRole[] = ['FieldOwner', 'Administrator'];

const HarvestHeaderButton: React.FC = () => {
  const { t } = useTranslation('fields');
  const { user } = useAuth();
  const campaign = useHarvestCampaignOptional();
  const location = useLocation();
  const role = (user?.role || '') as AppRole;

  if (!HARVEST_ROLES.includes(role) || !campaign) return null;

  const live = campaign.isLive;
  const onPage = location.pathname === '/harvest' || location.pathname.startsWith('/harvest/');

  return (
    <Link
      to="/harvest"
      className={`harvest-header-btn${live ? ' is-live' : ''}${onPage ? ' is-current' : ''}`}
      aria-current={onPage ? 'page' : undefined}
    >
      <Wheat size={18} aria-hidden />
      <span className="harvest-header-copy">
        <span className="harvest-header-label">
          {live ? t('harvestCampaign.headerLive') : t('harvestCampaign.headerIdle')}
        </span>
        {live ? (
          <span className="harvest-header-meta">{t('harvestCampaign.headerOpen')}</span>
        ) : null}
      </span>
    </Link>
  );
};

export default HarvestHeaderButton;

import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useActiveFieldAccess } from '../../hooks/useActiveFieldAccess';
import { isMockMode } from '../../services/serviceFactory';
import { useHarvestCampaignOptional } from '../../context/HarvestCampaignContext';
import { getHarvestCapabilities } from '../../harvestCampaign/harvestCapabilities';
import {
  navItems,
  filterNavItemsForUser,
  isNavActive,
  resolveNavItemLabel,
  AppRole,
} from '../../navigation/navConfig';
import './MobileBottomNav.css';

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMoreClick }) => {
  const { t } = useTranslation(['nav', 'common']);
  const { user } = useAuth();
  const activeField = useActiveFieldAccess();
  const harvest = useHarvestCampaignOptional();
  const location = useLocation();
  const userRole = (user?.role || '') as AppRole;

  const canViewHarvest = useMemo(() => {
    const caps = getHarvestCapabilities({
      hasAnyFieldAccess: activeField.ownsAnyField || activeField.isCollaboratorOnActive || Boolean(activeField.fieldId),
      canOwn:
        user?.role === 'FieldOwner' ||
        user?.role === 'Administrator' ||
        activeField.ownsAnyField,
      canWork:
        user?.role === 'Producer' ||
        user?.role === 'FieldOwner' ||
        user?.role === 'Administrator' ||
        activeField.isCollaboratorOnActive,
      familyModules: activeField.modules,
      accessLevel: activeField.accessLevel,
      harvestModuleGranted:
        !activeField.modules ||
        activeField.modules.size === 0 ||
        activeField.modules.has('harvest') ||
        activeField.isAdminOnActive,
    });
    return caps.canView;
  }, [user, activeField]);

  const primaryItems = useMemo(() => {
    const visible = filterNavItemsForUser(navItems, userRole, isMockMode(), {
      modules: activeField.modules,
      isAdminOnActive: activeField.isAdminOnActive,
      canViewHarvest,
    });
    const harvestItem = visible.find((item) => item.path === '/harvest');
    let items = visible.filter((item) => item.mobilePrimary);
    if (harvest?.isLive && harvestItem) {
      items = [harvestItem, ...items.filter((item) => item.path !== '/chronologio' && item.path !== '/harvest')];
    }
    return items.slice(0, 3);
  }, [userRole, activeField.modules, activeField.isAdminOnActive, canViewHarvest, harvest?.isLive]);

  const harvestPage = location.pathname === '/harvest' || location.pathname.startsWith('/harvest/');
  if (harvest?.isLive && harvestPage) return null;

  const primaryActive = primaryItems.some((item) => isNavActive(location.pathname, item.path));

  return (
    <nav className="mobile-bottom-nav" aria-label={t('common:mobileNav', { defaultValue: 'Primary navigation' })}>
      {primaryItems.map((item) => {
        const active = isNavActive(location.pathname, item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            reloadDocument={false}
            className={`mobile-bottom-nav-item ${active ? 'active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="mobile-bottom-nav-icon">{item.icon}</span>
            <span className="mobile-bottom-nav-label">{resolveNavItemLabel(item, userRole, t, { mobile: true })}</span>
          </Link>
        );
      })}
      <button
        type="button"
        className={`mobile-bottom-nav-item mobile-bottom-nav-more ${!primaryActive ? 'active' : ''}`}
        onClick={onMoreClick}
        aria-label={t('common:moreNav', { defaultValue: 'More' })}
      >
        <span className="mobile-bottom-nav-icon">
          <MoreHorizontal />
        </span>
        <span className="mobile-bottom-nav-label">{t('common:moreNav')}</span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;

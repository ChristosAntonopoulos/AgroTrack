import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useExperienceMode } from '../../context/ExperienceModeContext';
import { useFamilyMembershipModules } from '../../hooks/useFamilyMembershipModules';
import { isMockMode } from '../../services/serviceFactory';
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
  const { isEveryday } = useExperienceMode();
  const familyModules = useFamilyMembershipModules();
  const location = useLocation();
  const userRole = (user?.role || '') as AppRole;

  const primaryItems = useMemo(() => {
    const visible = filterNavItemsForUser(navItems, userRole, isEveryday, isMockMode(), familyModules);
    return visible.filter((item) => item.mobilePrimary);
  }, [userRole, isEveryday, familyModules]);

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
            <span className="mobile-bottom-nav-label">{resolveNavItemLabel(item, userRole, t)}</span>
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
        <span className="mobile-bottom-nav-label">{t('common:moreNav', { defaultValue: 'More' })}</span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;

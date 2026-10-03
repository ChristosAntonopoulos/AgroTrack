import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useActiveFieldAccess } from '../../hooks/useActiveFieldAccess';
import { isMockMode } from '../../services/serviceFactory';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';
import { useHarvestCampaignOptional } from '../../context/HarvestCampaignContext';
import { useCaptureOptional } from '../../context/CaptureContext';
import { getHarvestCapabilities } from '../../harvestCampaign/harvestCapabilities';
import {
  navItems,
  filterNavItemsForUser,
  isNavActive,
  resolveNavItemLabel,
  AppRole,
} from '../../navigation/navConfig';
import BrandLogo from '../Common/BrandLogo';
import './MobileBottomNav.css';

interface MobileBottomNavProps {
  onMoreClick: () => void;
  /** When true, More is the active destination (More panel open). */
  moreOpen?: boolean;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMoreClick, moreOpen = false }) => {
  const { t } = useTranslation(['nav', 'common', 'capture']);
  const { user } = useAuth();
  const activeField = useActiveFieldAccess();
  const harvest = useHarvestCampaignOptional();
  const capture = useCaptureOptional();
  const activation = useOwnerActivationOptional();
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

  const primaryActive =
    !moreOpen && primaryItems.some((item) => isNavActive(location.pathname, item.path));
  const moreActive = moreOpen || !primaryActive;

  const leftItems = primaryItems.slice(0, 2);
  const rightItems = primaryItems.slice(2);

  const openCapture = () => {
    capture?.openCapture();
  };

  return (
    <nav className="mobile-bottom-nav" aria-label={t('common:mobileNav', { defaultValue: 'Primary navigation' })}>
      <div className="mobile-bottom-nav-dock">
        {leftItems.map((item) => {
          const active = !moreOpen && isNavActive(location.pathname, item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              reloadDocument={false}
              data-guide-target={
                item.path === '/fields' ? 'fieldsNav' : item.path === '/chronologio' ? 'historyNav' : undefined
              }
              className={`mobile-bottom-nav-item ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                if (item.path === '/chronologio') activation?.completeHistoryStep();
              }}
            >
              <span className="mobile-bottom-nav-icon">{item.icon}</span>
              <span className="mobile-bottom-nav-label">{resolveNavItemLabel(item, userRole, t, { mobile: true })}</span>
            </Link>
          );
        })}

        <button
          type="button"
          className="mobile-bottom-nav-capture"
          data-guide-target="captureFab"
          aria-label={t('capture:ctaPlus')}
          onClick={() => {
            if (!capture || capture.isOpen) return;
            openCapture();
          }}
        >
          <span className="mobile-bottom-nav-capture-icon" aria-hidden>
            <Plus size={26} strokeWidth={2.5} />
          </span>
          <span className="mobile-bottom-nav-capture-label">{t('capture:cta')}</span>
        </button>

        {rightItems.map((item) => {
          const active = !moreOpen && isNavActive(location.pathname, item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              reloadDocument={false}
              data-guide-target={
                item.path === '/fields' ? 'fieldsNav' : item.path === '/chronologio' ? 'historyNav' : undefined
              }
              className={`mobile-bottom-nav-item ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                if (item.path === '/chronologio') activation?.completeHistoryStep();
              }}
            >
              <span className="mobile-bottom-nav-icon">{item.icon}</span>
              <span className="mobile-bottom-nav-label">{resolveNavItemLabel(item, userRole, t, { mobile: true })}</span>
            </Link>
          );
        })}

        <button
          type="button"
          className={`mobile-bottom-nav-menu ${moreActive ? 'active' : ''}`}
          onClick={onMoreClick}
          aria-pressed={moreOpen}
          aria-label={t('common:menuNav', { defaultValue: t('common:moreNav') })}
        >
          <span className="mobile-bottom-nav-menu-mark" aria-hidden>
            <BrandLogo variant="mark" tone="on-light" size="xs" alt="" />
          </span>
          <span className="mobile-bottom-nav-menu-label">
            {t('common:menuNav', { defaultValue: t('common:moreNav') })}
          </span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;

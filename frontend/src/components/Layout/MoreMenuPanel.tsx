import React, { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useFeedbackOptional } from '../../context/FeedbackContext';
import { useHarvestCampaignOptional } from '../../context/HarvestCampaignContext';
import { useActiveFieldAccess, useActiveFieldCollaboratorLabel } from '../../hooks/useActiveFieldAccess';
import { isMockMode } from '../../services/serviceFactory';
import BrandLogo from '../Common/BrandLogo';
import NotificationBell from '../Notifications/NotificationBell';
import {
  navItems,
  filterNavItemsForUser,
  isNavActive,
  resolveNavItemLabel,
  AppRole,
  type NavItem,
} from '../../navigation/navConfig';
import './MoreMenuPanel.css';

interface MoreMenuPanelProps {
  onNavigate?: () => void;
}

type MoreSectionId = 'work' | 'account';

const WORK_PATHS = new Set(['/partners', '/money', '/my-oil', '/photos', '/harvest']);

/** Phone “More” body — identity + grouped destinations, matching the mobile app. */
const MoreMenuPanel: React.FC<MoreMenuPanelProps> = ({ onNavigate }) => {
  const { t } = useTranslation(['nav', 'common', 'fields']);
  const { user, logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const feedback = useFeedbackOptional();
  const harvest = useHarvestCampaignOptional();
  const activeField = useActiveFieldAccess();
  const collaboratorOwnerLabel = useActiveFieldCollaboratorLabel();
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = (user?.role || '') as AppRole;
  const logoTone = resolvedTheme === 'dark' ? 'on-dark' : 'on-light';

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    t('common:moreNav');
  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const collaboratorBadge = collaboratorOwnerLabel
    ? t('common:familyCollaboratorBadge', { owner: collaboratorOwnerLabel })
    : null;

  const visible = useMemo(
    () =>
      filterNavItemsForUser(navItems, userRole, isMockMode(), {
        modules: activeField.modules,
        isAdminOnActive: activeField.isAdminOnActive,
      }),
    [userRole, activeField.modules, activeField.isAdminOnActive]
  );

  const sections = useMemo(() => {
    const workItems = visible.filter(
      (item) => !item.mobilePrimary && WORK_PATHS.has(item.path)
    );
    const accountItems = visible.filter(
      (item) =>
        !item.mobilePrimary &&
        !WORK_PATHS.has(item.path) &&
        (item.section === 'account' || item.section === 'secondary')
    );

    const orderedWork = WORK_PATHS.size
      ? [...WORK_PATHS]
          .map((path) => workItems.find((item) => item.path === path))
          .filter((item): item is NavItem => Boolean(item))
      : workItems;

    return (
      [
        { id: 'work' as MoreSectionId, titleKey: 'sections.work', items: orderedWork },
        { id: 'account' as MoreSectionId, titleKey: 'sections.account', items: accountItems },
      ] as const
    ).filter((section) => section.items.length > 0);
  }, [visible]);

  const itemLabel = (item: NavItem) => {
    if (item.path === '/harvest' && harvest?.isLive) {
      return `${t('fields:harvestCampaign.title', {
        defaultValue: t('nav:items.thisHarvest'),
      })} · ${t('fields:harvestCampaign.headerOpen', { defaultValue: 'Live' })}`;
    }
    return resolveNavItemLabel(item, userRole, t);
  };

  const handleLogout = () => {
    onNavigate?.();
    logout();
    navigate('/login');
  };

  return (
    <div className="more-menu-panel" role="navigation" aria-label={t('common:moreNav')}>
      <header className="more-menu-header">
        <div className="more-menu-header-top">
          <div className="more-menu-title-block">
            <h2 className="more-menu-title">{displayName}</h2>
            {collaboratorBadge ? (
              <p className="more-menu-subtitle">{collaboratorBadge}</p>
            ) : null}
          </div>
          <NotificationBell />
        </div>
        <div className="more-menu-identity">
          <div className="more-menu-avatar" aria-hidden>
            {initials}
          </div>
          <BrandLogo variant="horizontal" tone={logoTone} size="xs" />
        </div>
      </header>

      {sections.map((section) => (
        <section key={section.id} className="more-menu-section">
          <h3 className="more-menu-section-title">{t(section.titleKey)}</h3>
          <ul className="more-menu-list">
            {section.items.map((item, index) => {
              const label = itemLabel(item);
              const active = item.action !== 'feedback' && isNavActive(location.pathname, item.path);
              const rowClass = [
                'more-menu-item',
                active ? 'is-active' : '',
                index < section.items.length - 1 ? 'has-divider' : '',
              ]
                .filter(Boolean)
                .join(' ');

              if (item.action === 'feedback') {
                return (
                  <li key={item.path}>
                    <button
                      type="button"
                      className={rowClass}
                      onClick={() => {
                        onNavigate?.();
                        feedback?.openFeedback();
                      }}
                    >
                      <span className="more-menu-item-left">
                        <span className="more-menu-item-icon">{item.icon}</span>
                        <span className="more-menu-item-label">{label}</span>
                      </span>
                      <ChevronRight className="more-menu-chevron" aria-hidden size={18} />
                    </button>
                  </li>
                );
              }

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    reloadDocument={false}
                    className={rowClass}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => onNavigate?.()}
                  >
                    <span className="more-menu-item-left">
                      <span className="more-menu-item-icon">{item.icon}</span>
                      <span className="more-menu-item-label">{label}</span>
                    </span>
                    <ChevronRight className="more-menu-chevron" aria-hidden size={18} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="more-menu-footer">
        <button type="button" className="more-menu-logout" onClick={handleLogout}>
          {t('common:logout')}
        </button>
      </div>
    </div>
  );
};

export default MoreMenuPanel;

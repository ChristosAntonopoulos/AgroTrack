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

type MoreSectionId = 'catalog' | 'account';

/** Preferred catalog order — inventory / workshop rhythm. */
const CATALOG_PATHS = [
  '/chronologio',
  '/fields',
  '/tasks',
  '/harvest',
  '/my-oil',
  '/money',
  '/photos',
  '/partners',
] as const;

const HINT_BY_PATH: Record<string, string> = {
  '/chronologio': 'hints.chronologio',
  '/fields': 'hints.fields',
  '/tasks': 'hints.tasks',
  '/harvest': 'hints.harvest',
  '/my-oil': 'hints.myOil',
  '/money': 'hints.money',
  '/photos': 'hints.photos',
  '/partners': 'hints.partners',
  '/settings': 'hints.settings',
  '/help': 'hints.help',
  '__feedback__': 'hints.feedback',
  '/data-sources': 'hints.dataSources',
  '/admin/campaigns': 'hints.campaigns',
  '/admin/feedback': 'hints.userFeedback',
};

/** Phone “More” body — compact brand header + numbered destination panels. */
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
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '';
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
    const byPath = new Map(visible.map((item) => [item.path, item]));

    const catalogItems = CATALOG_PATHS.map((path) => byPath.get(path)).filter(
      (item): item is NavItem => Boolean(item)
    );

    const catalogPaths = new Set(catalogItems.map((item) => item.path));
    const accountItems = visible.filter(
      (item) =>
        !catalogPaths.has(item.path) &&
        (item.section === 'account' || item.section === 'secondary')
    );

    return (
      [
        { id: 'catalog' as MoreSectionId, titleKey: 'sections.operations', items: catalogItems },
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

  const itemHint = (item: NavItem) => {
    const key = HINT_BY_PATH[item.path];
    if (!key) return null;
    if (item.path === '/harvest' && harvest?.isLive) {
      return t('hints.harvestLive', { defaultValue: t(key) });
    }
    return t(key);
  };

  const handleLogout = () => {
    onNavigate?.();
    logout();
    navigate('/login');
  };

  let catalogIndex = 0;

  return (
    <div
      className="more-menu-panel"
      role="navigation"
      aria-label={t('common:menuNav', { defaultValue: t('common:moreNav') })}
    >
      <header className="more-menu-header">
        <div className="more-menu-header-top">
          <div className="more-menu-brand">
            <BrandLogo variant="mark" tone={logoTone} size="xs" className="more-menu-brand-mark" />
            <div className="more-menu-brand-text">
              <h2 className="more-menu-title">
                {t('common:menuNav', { defaultValue: t('common:moreNav') })}
              </h2>
              <p className="more-menu-brand-name">
                {t('common:appName', { defaultValue: 'THE OLIVE LOT' })}
              </p>
            </div>
          </div>
          <NotificationBell />
        </div>
        {(displayName || collaboratorBadge) && (
          <p className="more-menu-identity-line">
            {displayName}
            {collaboratorBadge ? ` · ${collaboratorBadge}` : ''}
          </p>
        )}
      </header>

      {sections.map((section) => (
        <section key={section.id} className="more-menu-section">
          <h3 className="more-menu-section-title">{t(section.titleKey)}</h3>
          <ul className="more-menu-list">
            {section.items.map((item) => {
              catalogIndex += 1;
              const indexLabel = String(catalogIndex).padStart(2, '0');
              const label = itemLabel(item);
              const hint = itemHint(item);
              const active = item.action !== 'feedback' && isNavActive(location.pathname, item.path);
              const isHarvest = item.path === '/harvest';
              const rowClass = [
                'more-menu-card',
                active ? 'is-active' : '',
                isHarvest ? 'is-harvest' : '',
                harvest?.isLive && isHarvest ? 'is-harvest-live' : '',
              ]
                .filter(Boolean)
                .join(' ');

              const body = (
                <>
                  <span className="more-menu-card-index" aria-hidden>
                    {indexLabel}
                  </span>
                  <span className="more-menu-card-copy">
                    <span className="more-menu-card-label">{label}</span>
                    {hint ? <span className="more-menu-card-hint">{hint}</span> : null}
                  </span>
                  <span className="more-menu-card-geometry" aria-hidden />
                  <ChevronRight className="more-menu-chevron" aria-hidden size={18} />
                </>
              );

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
                      {body}
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
                    {body}
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

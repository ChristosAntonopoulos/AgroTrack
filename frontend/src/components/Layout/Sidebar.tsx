import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useActiveFieldAccess } from '../../hooks/useActiveFieldAccess';
import { useFeedbackOptional } from '../../context/FeedbackContext';
import { isMockMode } from '../../services/serviceFactory';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';
import { getHarvestCapabilities } from '../../harvestCampaign/harvestCapabilities';
import {
  navItems,
  navSections,
  isNavActive,
  AppRole,
  resolveNavItemLabel,
  filterNavItemsForUser,
} from '../../navigation/navConfig';
import './Sidebar.css';

interface SidebarProps {
  onNavigate?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const { t } = useTranslation(['nav', 'common']);
  const { user } = useAuth();
  const activeField = useActiveFieldAccess();
  const feedback = useFeedbackOptional();
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

  const filteredItems = useMemo(
    () =>
      filterNavItemsForUser(navItems, userRole, isMockMode(), {
        modules: activeField.modules,
        isAdminOnActive: activeField.isAdminOnActive,
        canViewHarvest,
      }),
    [userRole, activeField.modules, activeField.isAdminOnActive, canViewHarvest]
  );

  const visibleSections = navSections.filter((s) => filteredItems.some((i) => i.section === s.id));

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {visibleSections.map((section) => {
          const items = filteredItems.filter((i) => i.section === section.id);
          if (items.length === 0) return null;
          return (
            <div key={section.id} className="nav-section">
              <div className="nav-section-title">{t(section.labelKey)}</div>
              <ul className="nav-list">
                {items.map((item) => {
                  const label = resolveNavItemLabel(item, userRole, t);
                  if (item.action === 'feedback') {
                    return (
                      <li key={item.path} className="nav-item">
                        <button
                          type="button"
                          className={`nav-link ${feedback?.isOpen ? 'active' : ''}`}
                          onClick={() => {
                            onNavigate?.();
                            feedback?.openFeedback();
                          }}
                        >
                          <span className="nav-icon">{item.icon}</span>
                          <span className="nav-label">{label}</span>
                        </button>
                      </li>
                    );
                  }
                  const guideTarget =
                    item.path === '/fields' ? 'fieldsNav' : item.path === '/chronologio' ? 'historyNav' : undefined;
                  return (
                    <li key={item.path} className="nav-item">
                      <Link
                        to={item.path}
                        reloadDocument={false}
                        data-guide-target={guideTarget}
                        className={`nav-link ${isNavActive(location.pathname, item.path) ? 'active' : ''}`}
                        onClick={() => {
                          onNavigate?.();
                          if (item.path === '/chronologio') activation?.completeHistoryStep();
                        }}
                      >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;

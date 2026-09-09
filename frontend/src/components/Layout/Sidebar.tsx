import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useExperienceMode } from '../../context/ExperienceModeContext';
import { useFamilyMembershipModules } from '../../hooks/useFamilyMembershipModules';
import { isMockMode } from '../../services/serviceFactory';
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
  const { isEveryday } = useExperienceMode();
  const familyModules = useFamilyMembershipModules();
  const location = useLocation();
  const userRole = (user?.role || '') as AppRole;

  const filteredItems = useMemo(
    () => filterNavItemsForUser(navItems, userRole, isEveryday, isMockMode(), familyModules),
    [userRole, isEveryday, familyModules]
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
                {items.map((item) => (
                  <li key={item.path} className="nav-item">
                    <Link
                      to={item.path}
                      reloadDocument={false}
                      className={`nav-link ${isNavActive(location.pathname, item.path) ? 'active' : ''}`}
                      onClick={onNavigate}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-label">{resolveNavItemLabel(item, userRole, t)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;

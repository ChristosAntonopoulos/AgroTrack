import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useExperienceMode } from '../../context/ExperienceModeContext';
import { isMockMode } from '../../services/serviceFactory';
import { isEverydayAllowedPath, isEverydayPrimaryPath } from '../../experience/catalog';
import { navItems, navSections, isNavActive, AppRole, resolveNavItemLabel } from '../../navigation/navConfig';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const { t } = useTranslation(['nav', 'common']);
  const { user } = useAuth();
  const { isEveryday } = useExperienceMode();
  const location = useLocation();
  const userRole = (user?.role || '') as AppRole;

  const filteredItems = useMemo(() => {
    return navItems.filter((item) => {
      if (!item.roles.includes(userRole)) return false;
      if (item.mockOnly && !isMockMode()) return false;
      if (isEveryday) {
        if (item.path === '/dashboard') return false;
        if (item.path === '/analytics' || item.path === '/reports' || item.path === '/data-sources') {
          return false;
        }
        if (item.path === '/people') return true;
        return isEverydayAllowedPath(item.path) || isEverydayPrimaryPath(item.path);
      }
      return true;
    });
  }, [userRole, isEveryday]);

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
                      className={`nav-link ${isNavActive(location.pathname, item.path) ? 'active' : ''}`}
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

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import './Breadcrumbs.css';

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const getBreadcrumbName = (path: string) => {
    const nameMap: { [key: string]: string } = {
      dashboard: 'Dashboard',
      fields: 'Fields',
      tasks: 'Tasks',
      calendar: 'Calendar',
      analytics: 'Analytics',
      reports: 'Reports',
      settings: 'Settings',
      new: 'New',
      edit: 'Edit',
    };
    return nameMap[path] || path.charAt(0).toUpperCase() + path.slice(1);
  };

  if (pathnames.length === 0) {
    return null;
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        <li className="breadcrumb-item">
          <Link to="/dashboard" className="breadcrumb-link">
            <Home />
            <span>Dashboard</span>
          </Link>
        </li>
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          const name = getBreadcrumbName(value);

          return (
            <li key={to} className="breadcrumb-item">
              <ChevronRight className="breadcrumb-separator" />
              {isLast ? (
                <span className="breadcrumb-current">{name}</span>
              ) : (
                <Link to={to} className="breadcrumb-link">
                  {name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;

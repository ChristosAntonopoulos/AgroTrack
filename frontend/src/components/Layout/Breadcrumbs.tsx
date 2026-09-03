import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { resolveBreadcrumbLabel, roleHomePath, AppRole } from '../../navigation/navConfig';
import { demoStore } from '../../services/demo/demoStore';
import { isMockMode } from '../../services/serviceFactory';
import { useFieldName } from '../../hooks/useFieldName';
import './Breadcrumbs.css';

const Breadcrumbs: React.FC = () => {
  const { t } = useTranslation(['nav', 'common']);
  const location = useLocation();
  const { user } = useAuth();
  const role = (user?.role || '') as AppRole;
  const pathnames = location.pathname.split('/').filter((x) => x);

  const fieldIdFromPath = useMemo(() => {
    const fieldsIndex = pathnames.indexOf('fields');
    const candidate = fieldsIndex >= 0 ? pathnames[fieldsIndex + 1] : undefined;
    if (!candidate || candidate === 'new' || candidate === 'edit') return undefined;
    return candidate;
  }, [pathnames]);

  const apiFieldName = useFieldName(fieldIdFromPath);

  if (pathnames.length === 0) {
    return null;
  }

  const resolveDynamicLabel = (segment: string, to: string) => {
    if (to.startsWith('/fields/') && segment !== 'fields' && segment !== 'new' && segment !== 'edit' && segment !== 'task-templates' && segment !== 'history') {
      if (segment === fieldIdFromPath && apiFieldName) return apiFieldName;
      if (isMockMode()) {
        demoStore.ensureSeeded();
        const f = demoStore.getFields().find((x) => x.id === segment);
        if (f?.name) return f.name;
      }
    }
    return resolveBreadcrumbLabel(segment, role, t);
  };

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        <li className="breadcrumb-item">
          <Link to={roleHomePath(role)} className="breadcrumb-link">
            <Home />
            <span>{t('common:home')}</span>
          </Link>
        </li>
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          const name = resolveDynamicLabel(value, to);

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

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, LogOut, Menu } from 'lucide-react';
import BrandLogo from '../Common/BrandLogo';
import NotificationBell from '../Notifications/NotificationBell';
import { resolvePageTitle, AppRole } from '../../navigation/navConfig';
import { useLocale } from '../../context/LocaleProvider';
import { SUPPORTED_LOCALES, SupportedLocale } from '../../i18n/config';
import './Header.css';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { t } = useTranslation('nav');
  const { t: tCommon } = useTranslation('common');
  const { user, logout } = useAuth();
  const { locale, setLocale } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const role = (user?.role || '') as AppRole;
  const pageTitle = resolvePageTitle(location.pathname, role, t);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleDisplayName = (userRole: string) =>
    tCommon(`roles.${userRole}`, { defaultValue: userRole });

  const bilingualLocales = SUPPORTED_LOCALES.filter((l) => l.code === 'en' || l.code === 'el');

  return (
    <header className="app-header">
      <div className="header-brand-slot">
        <button className="menu-button" onClick={onMenuClick} aria-label={tCommon('toggleMenu')}>
          <Menu />
        </button>
        <div className="header-brand">
          <BrandLogo size="xs" />
          <span className="header-brand-name">{tCommon('appName')}</span>
        </div>
      </div>

      <div className="header-main">
        <h1 className="page-title">{pageTitle}</h1>

        <div className="header-right">
          <div className="header-lang-switch" role="group" aria-label={tCommon('language', { defaultValue: 'Language' })}>
            {bilingualLocales.map((lang) => (
              <button
                key={lang.code}
                type="button"
                className={`header-lang-btn ${locale === lang.code ? 'header-lang-btn-active' : ''}`}
                onClick={() => setLocale(lang.code as SupportedLocale)}
                aria-pressed={locale === lang.code}
              >
                {lang.code.toUpperCase()}
              </button>
            ))}
          </div>

          <NotificationBell />

          <div className="user-menu">
            <div className="user-info">
              <User className="user-icon" />
              <div className="user-details">
                <span className="user-name">{user?.email}</span>
                <span className="user-role">{getRoleDisplayName(user?.role || '')}</span>
              </div>
            </div>
            <button className="logout-button" onClick={handleLogout} aria-label={tCommon('logoutAria')}>
              <LogOut />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

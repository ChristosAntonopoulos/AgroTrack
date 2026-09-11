import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { roleHomePath } from '../../navigation/navConfig';
import { User, LogOut, Menu, MoreVertical, Plus } from 'lucide-react';
import BrandLogo from '../Common/BrandLogo';
import NotificationBell from '../Notifications/NotificationBell';
import ExperienceModeToggle from '../Experience/ExperienceModeToggle';
import { resolvePageTitle, AppRole } from '../../navigation/navConfig';
import { useTheme } from '../../context/ThemeContext';
import { useCaptureOptional } from '../../context/CaptureContext';
import './Header.css';
import '../Capture/Capture.css';

interface HeaderProps {
  onMenuClick?: () => void;
  hideMenuButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, hideMenuButton }) => {
  const { t } = useTranslation('nav');
  const { t: tCommon } = useTranslation('common');
  const { t: tSettings } = useTranslation('settings');
  const { t: tCapture } = useTranslation('capture');
  const { user, logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const capture = useCaptureOptional();
  const logoTone = resolvedTheme === 'dark' ? 'on-dark' : 'on-light';
  const navigate = useNavigate();
  const location = useLocation();
  const role = (user?.role || '') as AppRole;
  const pageTitle = resolvePageTitle(location.pathname, role, t);
  const hidePageTitle =
    location.pathname === '/tasks' ||
    location.pathname === '/tasks/new' ||
    location.pathname === '/chronologio';
  const hideHeaderCapture = location.pathname === '/chronologio';
  const hideAppModeToggle = /^\/fields\/(?!new(?:\/|$))[^/]+/.test(location.pathname);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '';

  useEffect(() => {
    setOverflowOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!overflowOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOverflowOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [overflowOpen]);

  return (
    <header className="app-header">
      <div className="header-brand-slot">
        {!hideMenuButton ? (
        <button className="menu-button" onClick={onMenuClick} aria-label={tCommon('toggleMenu')}>
          <Menu />
        </button>
        ) : null}
        <Link to={roleHomePath(role)} className="header-brand" aria-label={tCommon('home')}>
          <BrandLogo
            className="header-logo-lockup"
            variant="horizontal"
            tone={logoTone}
            size="xs"
            alt={tCommon('appName')}
          />
          <BrandLogo
            className="header-logo-mark"
            variant="favicon"
            size="sm"
            alt=""
          />
        </Link>
      </div>

      <div className="header-main">
        {hidePageTitle ? null : <h1 className="page-title">{pageTitle}</h1>}

        <div className="header-right">
          {capture && !hideHeaderCapture ? (
            <button
              type="button"
              className="capture-header-cta"
              onClick={() => capture.openCapture()}
            >
              <Plus size={18} aria-hidden />
              {tCapture('cta')}
            </button>
          ) : null}

          {hideAppModeToggle ? null : (
            <div className="header-desktop-controls u-hide-below-md">
              <ExperienceModeToggle compact />
            </div>
          )}

          <NotificationBell />

          <div className="user-menu u-hide-below-md">
            <div className="user-info">
              <User className="user-icon" />
              <div className="user-details">
                <span className="user-name">{displayName}</span>
                {displayName !== user?.email ? (
                  <span className="user-role">{user?.email}</span>
                ) : null}
              </div>
            </div>
            <button className="logout-button" onClick={handleLogout} aria-label={tCommon('logoutAria')}>
              <LogOut />
            </button>
          </div>

          <div className="header-overflow u-hide-above-md" ref={overflowRef}>
            <button
              type="button"
              className="icon-button header-overflow-trigger"
              aria-label={tCommon('moreMenu', { defaultValue: 'More options' })}
              aria-expanded={overflowOpen}
              aria-haspopup="true"
              onClick={() => setOverflowOpen((v) => !v)}
            >
              <MoreVertical />
            </button>
            {overflowOpen && (
              <div className="header-overflow-menu" role="menu">
                {hideAppModeToggle ? null : (
                  <div className="header-overflow-section">
                    <div className="header-overflow-label">{tSettings('experience.label')}</div>
                    <ExperienceModeToggle compact />
                  </div>
                )}
                <div className="header-overflow-user">
                  <User size={18} aria-hidden />
                  <span className="header-overflow-user-name">{displayName}</span>
                </div>
                <button
                  type="button"
                  className="header-overflow-logout"
                  onClick={() => {
                    setOverflowOpen(false);
                    navigate('/settings');
                  }}
                  role="menuitem"
                >
                  {t('items.settings')}
                </button>
                <button
                  type="button"
                  className="header-overflow-logout"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <LogOut size={18} aria-hidden />
                  {tCommon('logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

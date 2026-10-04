import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { roleHomePath, AppRole } from '../../navigation/navConfig';
import { User, LogOut, Menu, MoreVertical, Plus } from 'lucide-react';
import HarvestHeaderButton from './HarvestHeaderButton';
import BrandLogo from '../Common/BrandLogo';
import NotificationBell from '../Notifications/NotificationBell';
import { useTheme } from '../../context/ThemeContext';
import { useCaptureOptional } from '../../context/CaptureContext';
import { useFeedbackOptional } from '../../context/FeedbackContext';
import { useActiveFieldCollaboratorLabel } from '../../hooks/useActiveFieldAccess';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';
import './Header.css';
import '../Capture/Capture.css';

interface HeaderProps {
  onMenuClick?: () => void;
  hideMenuButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, hideMenuButton }) => {
  const { t } = useTranslation('nav');
  const { t: tCommon } = useTranslation('common');
  const { t: tCapture } = useTranslation('capture');
  const { user, logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const capture = useCaptureOptional();
  const feedback = useFeedbackOptional();
  const activation = useOwnerActivationOptional();
  const hideChromeExtras = Boolean(activation?.locked);
  const collaboratorOwnerLabel = useActiveFieldCollaboratorLabel();
  const logoTone = resolvedTheme === 'dark' ? 'on-dark' : 'on-light';
  const navigate = useNavigate();
  const location = useLocation();
  const role = (user?.role || '') as AppRole;
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  const collaboratorBadge = collaboratorOwnerLabel
    ? tCommon('familyCollaboratorBadge', { owner: collaboratorOwnerLabel })
    : null;

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
        <Link
          to={hideChromeExtras ? location.pathname : roleHomePath(role)}
          className="header-brand"
          data-guide-target="homeButton"
          aria-label={tCommon('home')}
          onClick={(e) => {
            if (hideChromeExtras) e.preventDefault();
          }}
        >
          <BrandLogo
            className="header-logo-lockup"
            variant="horizontal"
            tone={logoTone}
            size="md"
            alt={tCommon('appName')}
          />
        </Link>
      </div>

      <div className="header-main">
        <div className="header-right">
          {!hideChromeExtras ? <HarvestHeaderButton /> : null}
          {capture && !hideChromeExtras ? (
            <button
              type="button"
              className="capture-header-cta u-hide-below-md"
              onClick={() => capture.openCapture()}
            >
              <Plus size={18} aria-hidden />
              {tCapture('cta')}
            </button>
          ) : null}

          {!hideChromeExtras ? <NotificationBell /> : null}

          <div className="user-menu u-hide-below-md">
            <div className="user-info">
              <User className="user-icon" />
              <div className="user-details">
                <span className="user-name">{displayName}</span>
                {collaboratorBadge ? (
                  <span className="user-role user-role-badge">{collaboratorBadge}</span>
                ) : displayName !== user?.email ? (
                  <span className="user-role">{user?.email}</span>
                ) : null}
              </div>
            </div>
            <button className="logout-button" onClick={handleLogout} aria-label={tCommon('logoutAria')}>
              <LogOut size={18} aria-hidden />
              <span>{tCommon('logout')}</span>
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
                <div className="header-overflow-user">
                  <User size={18} aria-hidden />
                  <div className="header-overflow-user-meta">
                    <span className="header-overflow-user-name">{displayName}</span>
                    {collaboratorBadge ? (
                      <span className="header-overflow-user-role">{collaboratorBadge}</span>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  className="header-overflow-item"
                  onClick={() => {
                    setOverflowOpen(false);
                    feedback?.openFeedback();
                  }}
                  role="menuitem"
                >
                  {t('items.feedback')}
                </button>
                <button
                  type="button"
                  className="header-overflow-item"
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

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, LogOut, Menu } from 'lucide-react';
import NotificationBell from '../Notifications/NotificationBell';
import { resolvePageTitle, AppRole } from '../../navigation/navConfig';
import './Header.css';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = (user?.role || '') as AppRole;
  const pageTitle = resolvePageTitle(location.pathname, role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: { [key: string]: string } = {
      FieldOwner: 'Field Owner',
      Producer: 'Producer',
      Agronomist: 'Agronomist',
      Administrator: 'Administrator',
      ServiceProvider: 'Service Provider',
    };
    return roleMap[role] || role;
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="menu-button" onClick={onMenuClick} aria-label="Toggle menu">
          <Menu />
        </button>
        <div className="header-titles">
          <div className="app-title">Olive Lifecycle</div>
          <div className="page-title">{pageTitle}</div>
        </div>
      </div>
      
      <div className="header-right">
        <NotificationBell />
        
        <div className="user-menu">
          <div className="user-info">
            <User className="user-icon" />
            <div className="user-details">
              <span className="user-name">{user?.email}</span>
              <span className="user-role">{getRoleDisplayName(user?.role || '')}</span>
            </div>
          </div>
          <button className="logout-button" onClick={handleLogout} aria-label="Logout">
            <LogOut />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  Layers,
  CheckSquare,
  BarChart2,
  FileText,
  Calendar,
  Settings,
} from 'lucide-react';
import './Sidebar.css';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

interface SidebarProps {
  sidebarOpen?: boolean;
}

const Sidebar: React.FC<SidebarProps> = () => {
  const { user } = useAuth();
  const location = useLocation();
  const userRole = user?.role || '';

  const navItems: NavItem[] = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: <Home />,
      roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator'],
    },
    {
      path: '/fields',
      label: userRole === 'FieldOwner' ? 'My Fields' : 'Fields',
      icon: <Layers />,
      roles: ['FieldOwner', 'Producer', 'Agronomist'],
    },
    {
      path: '/tasks',
      label: userRole === 'Producer' ? 'My Tasks' : 'Tasks',
      icon: <CheckSquare />,
      roles: ['FieldOwner', 'Producer', 'Agronomist'],
    },
    {
      path: '/calendar',
      label: 'Calendar',
      icon: <Calendar />,
      roles: ['FieldOwner', 'Producer'],
    },
    {
      path: '/analytics',
      label: 'Analytics',
      icon: <BarChart2 />,
      roles: ['FieldOwner', 'Administrator'],
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: <FileText />,
      roles: ['FieldOwner', 'Administrator'],
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: <Settings />,
      roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator'],
    },
  ];

  const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole));

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {filteredNavItems.map((item) => (
            <li key={item.path} className="nav-item">
              <Link
                to={item.path}
                className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;

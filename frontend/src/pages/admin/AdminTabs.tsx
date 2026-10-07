import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  LayoutDashboard,
  Megaphone,
  MessageSquareHeart,
  Users,
} from 'lucide-react';

const tabs = [
  { path: '/admin', end: true, icon: LayoutDashboard, labelKey: 'admin:overview.nav' },
  { path: '/admin/users', end: false, icon: Users, labelKey: 'admin:users.nav' },
  { path: '/admin/feedback', end: false, icon: MessageSquareHeart, labelKey: 'admin:feedback.nav' },
  { path: '/admin/errors', end: false, icon: AlertTriangle, labelKey: 'admin:errors.nav' },
  { path: '/admin/campaigns', end: false, icon: Megaphone, labelKey: 'admin:campaigns.nav' },
] as const;

const AdminTabs: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const { pathname } = useLocation();

  return (
    <div className="admin-tabs">
      {tabs.map(({ path, end, icon: Icon, labelKey }) => {
        const active = end ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);
        return (
          <Link key={path} to={path} className={`admin-tab${active ? ' is-active' : ''}`}>
            <Icon size={16} /> {t(labelKey)}
          </Link>
        );
      })}
    </div>
  );
};

export default AdminTabs;

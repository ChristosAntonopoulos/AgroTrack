import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import OfflineBanner from '../Offline/OfflineBanner';
import { CaptureProvider } from '../../context/CaptureContext';
import { useExperienceMode } from '../../context/ExperienceModeContext';
import { useIsMobile } from '../../hooks/useBreakpoint';
import './MainLayout.css';

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { experienceModeChosen } = useExperienceMode();
  const location = useLocation();
  const isMobile = useIsMobile();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  if (!experienceModeChosen) {
    return <Navigate to="/experience" replace />;
  }

  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => setSidebarOpen(true);
  const toggleSidebar = () => setSidebarOpen((v) => !v);

  return (
    <CaptureProvider>
      <div className="main-layout">
        <Header onMenuClick={toggleSidebar} />
        <div className="layout-content">
          <div className={`sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
            <Sidebar onNavigate={closeSidebar} />
          </div>
          {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} aria-hidden="true" />}
          <main className="main-content">
            <OfflineBanner />
            <Outlet />
          </main>
        </div>
        {isMobile && <MobileBottomNav onMoreClick={openSidebar} />}
      </div>
    </CaptureProvider>
  );
};

export default MainLayout;

import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import OfflineBanner from '../Offline/OfflineBanner';
import PhotoUploadRunner from '../photos/PhotoUploadRunner';
import { CaptureProvider } from '../../context/CaptureContext';
import { FeedbackProvider } from '../../context/FeedbackContext';
import { HarvestCampaignProvider } from '../../context/HarvestCampaignContext';
import { useIsMobile } from '../../hooks/useBreakpoint';
import './MainLayout.css';

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Scroll to top on route change; Tasks page restores its own scroll position.
  useEffect(() => {
    if (location.pathname === '/tasks') return;
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => setSidebarOpen(true);
  const toggleSidebar = () => setSidebarOpen((v) => !v);

  return (
    <HarvestCampaignProvider>
    <CaptureProvider>
    <FeedbackProvider>
      <div className="main-layout">
        <Header onMenuClick={toggleSidebar} hideMenuButton={isMobile} />
        <div className="layout-content">
          <div className={`sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
            <Sidebar onNavigate={closeSidebar} />
          </div>
          {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} aria-hidden="true" />}
          <main className="main-content">
            <div className="app-canvas" aria-hidden="true" />
            <OfflineBanner />
            <PhotoUploadRunner />
            <Outlet />
          </main>
        </div>
        {isMobile && <MobileBottomNav onMoreClick={openSidebar} />}
      </div>
    </FeedbackProvider>
    </CaptureProvider>
    </HarvestCampaignProvider>
  );
};

export default MainLayout;

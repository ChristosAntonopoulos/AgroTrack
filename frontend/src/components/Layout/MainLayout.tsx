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
import {
  OwnerActivationProvider,
  useOwnerActivationOptional,
} from '../../onboarding/OwnerActivationContext';
import OwnerActivationHost from '../onboarding/OwnerActivationHost';
import ActivationGate from '../onboarding/ActivationGate';
import NavCoach from '../onboarding/NavCoach';
import { useIsMobile } from '../../hooks/useBreakpoint';
import './MainLayout.css';

const MainLayoutChrome: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  const activation = useOwnerActivationOptional();
  const hideAppNav = Boolean(activation?.locked && !activation.guideBeat);

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
    <div className={`main-layout${hideAppNav ? ' is-activation-locked' : ''}`}>
      <Header onMenuClick={toggleSidebar} hideMenuButton={isMobile || hideAppNav} />
      <div className="layout-content">
        {!hideAppNav ? (
          <div className={`sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
            <Sidebar onNavigate={closeSidebar} />
          </div>
        ) : null}
        {sidebarOpen && !hideAppNav ? (
          <div className="sidebar-overlay" onClick={closeSidebar} aria-hidden="true" />
        ) : null}
        <main className="main-content">
          <div className="app-canvas" aria-hidden="true" />
          <OfflineBanner />
          <PhotoUploadRunner />
          <Outlet />
        </main>
      </div>
      {isMobile && !hideAppNav ? <MobileBottomNav onMoreClick={openSidebar} /> : null}
      <ActivationGate />
      <OwnerActivationHost />
      <NavCoach />
    </div>
  );
};

const MainLayout: React.FC = () => {
  return (
    <HarvestCampaignProvider>
      <CaptureProvider>
        <FeedbackProvider>
          <OwnerActivationProvider>
            <MainLayoutChrome />
          </OwnerActivationProvider>
        </FeedbackProvider>
      </CaptureProvider>
    </HarvestCampaignProvider>
  );
};

export default MainLayout;

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import MoreMenuPanel from './MoreMenuPanel';
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
import CaptureFab from '../Capture/CaptureFab';
import { useIsMobile } from '../../hooks/useBreakpoint';
import './MainLayout.css';

const MainLayoutChrome: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  const activation = useOwnerActivationOptional();
  const hideAppNav = Boolean(activation?.locked && !activation.guideBeat);

  useEffect(() => {
    setSidebarOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  // Scroll to top on route change; Tasks page restores its own scroll position.
  useEffect(() => {
    if (location.pathname === '/tasks') return;
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(false);
      setMoreOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen((v) => !v);
  const closeMore = () => setMoreOpen(false);
  const toggleMore = () => setMoreOpen((v) => !v);

  return (
    <div className={`main-layout${hideAppNav ? ' is-activation-locked' : ''}`}>
      <Header onMenuClick={toggleSidebar} hideMenuButton={isMobile || hideAppNav} />
      <div className="layout-content">
        {!isMobile && !hideAppNav ? (
          <div className={`sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
            <Sidebar onNavigate={closeSidebar} />
          </div>
        ) : null}
        {sidebarOpen && !isMobile && !hideAppNav ? (
          <div className="sidebar-overlay" onClick={closeSidebar} aria-hidden="true" />
        ) : null}
        <main className={`main-content${moreOpen && isMobile ? ' is-more-open' : ''}`}>
          <div className="app-canvas" aria-hidden="true" />
          <OfflineBanner />
          <PhotoUploadRunner />
          <ActivationGate />
        </main>
      </div>
      {moreOpen && isMobile && !hideAppNav ? <MoreMenuPanel onNavigate={closeMore} /> : null}
      {isMobile && !hideAppNav ? (
        <MobileBottomNav onMoreClick={toggleMore} moreOpen={moreOpen} />
      ) : null}
      {!hideAppNav ? <CaptureFab obscured={moreOpen} /> : null}
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

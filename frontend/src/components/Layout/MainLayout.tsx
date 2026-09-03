import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useExperienceMode } from '../../context/ExperienceModeContext';
import './MainLayout.css';

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { experienceModeChosen } = useExperienceMode();

  if (!experienceModeChosen) {
    return <Navigate to="/experience" replace />;
  }

  if (!experienceModeChosen) {
    return <Navigate to="/experience" replace />;
  }

  return (
    <div className="main-layout">
      <Header onMenuClick={() => setSidebarOpen((v) => !v)} />
      <div className="layout-content">
        <div className={`sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
          <Sidebar />
        </div>
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;

import './i18n';
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LocaleProvider } from './context/LocaleProvider';
import { NotificationProvider } from './context/NotificationContext';
import { ExperienceModeProvider } from './context/ExperienceModeContext';
import ProtectedRoute from './components/Common/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import FieldsPage from './pages/FieldsPage';
import FieldFormPage from './pages/FieldFormPage';
import FieldDetailPage from './pages/FieldDetailPage';
import FieldHistoryPage from './pages/FieldHistoryPage';
import FieldTaskTemplatesPage from './pages/FieldTaskTemplatesPage';
import TasksPage from './pages/TasksPage';
import TaskDetailPage from './pages/TaskDetailPage';
import TaskFormPage from './pages/TaskFormPage';
import CalendarPage from './pages/CalendarPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import DataSourcesPage from './pages/DataSourcesPage';
import MinistryNotificationsPage from './pages/MinistryNotificationsPage';
import TodayPage from './pages/TodayPage';
import ExperienceChooserPage from './pages/ExperienceChooserPage';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <ExperienceModeProvider>
            <NotificationProvider>
            <Router>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/experience" element={<ProtectedRoute><ExperienceChooserPage /></ProtectedRoute>} />
                <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="fields" element={<FieldsPage />} />
                  <Route path="fields/new" element={<FieldFormPage />} />
                  <Route path="fields/:id/task-templates" element={<FieldTaskTemplatesPage />} />
                  <Route path="fields/:id/history" element={<FieldHistoryPage />} />
                  <Route path="fields/:id/edit" element={<FieldFormPage />} />
                  <Route path="fields/:id" element={<FieldDetailPage />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="tasks/new" element={<TaskFormPage />} />
                  <Route path="tasks/:id" element={<TaskDetailPage />} />
                  <Route path="calendar" element={<CalendarPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="today" element={<TodayPage />} />
                  <Route path="ministry" element={<MinistryNotificationsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="data-sources" element={<DataSourcesPage />} />
                </Route>
              </Routes>
            </Router>
            </NotificationProvider>
          </ExperienceModeProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

export default App;

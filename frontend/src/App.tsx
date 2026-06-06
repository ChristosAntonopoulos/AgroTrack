import './i18n';
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LocaleProvider } from './context/LocaleProvider';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/Common/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import FieldsPage from './pages/FieldsPage';
import FieldFormPage from './pages/FieldFormPage';
import FieldDetailPage from './pages/FieldDetailPage';
import FieldTaskTemplatesPage from './pages/FieldTaskTemplatesPage';
import TasksPage from './pages/TasksPage';
import TaskDetailPage from './pages/TaskDetailPage';
import TaskFormPage from './pages/TaskFormPage';
import CalendarPage from './pages/CalendarPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import MinistryNotificationsPage from './pages/MinistryNotificationsPage';
import TodayPage from './pages/TodayPage';
import RoleHomeRedirect from './components/Common/RoleHomeRedirect';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <NotificationProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="fields" element={<FieldsPage />} />
                <Route path="fields/new" element={<FieldFormPage />} />
                <Route path="fields/:id/task-templates" element={<FieldTaskTemplatesPage />} />
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
                <Route path="" element={<RoleHomeRedirect />} />
              </Route>
            </Routes>
          </Router>
          </NotificationProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

export default App;

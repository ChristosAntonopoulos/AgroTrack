import './i18n';
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LocaleProvider } from './context/LocaleProvider';
import { NotificationProvider } from './context/NotificationContext';
import { ExperienceModeProvider, useExperienceMode } from './context/ExperienceModeContext';
import { OfflineProvider } from './context/OfflineContext';
import ProtectedRoute from './components/Common/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ExperienceChooserPage from './pages/ExperienceChooserPage';
import FieldsPage from './pages/FieldsPage';
import FieldFormPage from './pages/FieldFormPage';
import FieldDetailPage from './pages/FieldDetailPage';
import FieldWeatherVegetationPage from './pages/FieldWeatherVegetationPage';
import FieldWorkSetupPage from './pages/FieldWorkSetupPage';
import FieldWorkProfilePage from './pages/FieldWorkProfilePage';
import ChronologioPage from './pages/ChronologioPage';
import TasksPage from './pages/TasksPage';
import TaskDetailPage from './pages/TaskDetailPage';
import TaskFormPage from './pages/TaskFormPage';
import TaskCompletionPage from './pages/TaskCompletionPage';
import CalendarPage from './pages/CalendarPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import DataSourcesPage from './pages/DataSourcesPage';
import MinistryNotificationsPage from './pages/MinistryNotificationsPage';
import { CHRONOLOGIO_HOME, migrateLegacyHomePath } from './navigation/homePath';
import PartnersPage from './pages/PartnersPage';
import PartnerSearchPage from './pages/PartnerSearchPage';
import PartnerProfilePage from './pages/PartnerProfilePage';
import MyServiceProfilePage from './pages/MyServiceProfilePage';
import ServiceRequestsPage from './pages/ServiceRequestsPage';
import MoneyPage from './pages/MoneyPage';
import ThisHarvestPage from './pages/ThisHarvestPage';
import ThisHarvestReviewPage from './pages/ThisHarvestReviewPage';
import FamilyInviteAcceptPage from './pages/FamilyInviteAcceptPage';
import InviteAcceptPage from './pages/InviteAcceptPage';
import './App.css';

const FullOnlyRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isEveryday } = useExperienceMode();
  // Only kick off Full-only routes (analytics/reports/data-sources). Stay put elsewhere.
  if (isEveryday) return <Navigate to={CHRONOLOGIO_HOME} replace />;
  return children;
};

const FieldPeopleRedirect: React.FC = () => {
  const { id } = useParams();
  const search = id ? `?fieldId=${encodeURIComponent(id)}` : '';
  return <Navigate to={`/partners${search}`} replace />;
};

const TodayRedirect: React.FC = () => {
  const [params] = useSearchParams();
  const search = params.toString();
  return <Navigate to={migrateLegacyHomePath(search ? `/today?${search}` : '/today')} replace />;
};

const FieldChronologioRedirect: React.FC = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const next = new URLSearchParams(params);
  next.set('tab', 'chronologio');
  next.delete('mode');
  const qs = next.toString();
  return <Navigate to={id ? `/fields/${id}${qs ? `?${qs}` : ''}` : '/chronologio'} replace />;
};

function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <ExperienceModeProvider>
            <OfflineProvider>
            <NotificationProvider>
              <Router>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/invite/:token" element={<InviteAcceptPage />} />
                  <Route path="/family-invite/:token" element={<FamilyInviteAcceptPage />} />
                  <Route
                    path="/experience"
                    element={
                      <ProtectedRoute>
                        <ExperienceChooserPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    element={
                      <ProtectedRoute>
                        <MainLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="dashboard" element={<Navigate to={CHRONOLOGIO_HOME} replace />} />
                    <Route path="fields" element={<FieldsPage />} />
                    <Route path="fields/new" element={<FieldFormPage />} />
                    <Route path="fields/:id/chronologio" element={<FieldChronologioRedirect />} />
                    <Route path="fields/:id/weather" element={<FieldWeatherVegetationPage />} />
                    <Route path="fields/:id/work-setup" element={<FieldWorkSetupPage />} />
                    <Route path="fields/:id/work-profile" element={<FieldWorkProfilePage />} />
                    <Route path="fields/:id/edit" element={<FieldFormPage />} />
                    <Route
                      path="fields/:id/people"
                      element={<FieldPeopleRedirect />}
                    />
                    <Route path="fields/:id" element={<FieldDetailPage />} />
                    <Route path="chronologio" element={<ChronologioPage />} />
                    <Route path="tasks" element={<TasksPage />} />
                    <Route path="tasks/new" element={<TaskFormPage />} />
                    <Route path="tasks/:id/complete" element={<TaskCompletionPage />} />
                    <Route path="tasks/:id" element={<TaskDetailPage />} />
                    <Route path="people" element={<Navigate to="/partners" replace />} />
                    <Route path="partners" element={<PartnersPage />} />
                    <Route path="partners/search" element={<PartnerSearchPage />} />
                    <Route path="partners/me" element={<MyServiceProfilePage />} />
                    <Route path="partners/requests" element={<ServiceRequestsPage />} />
                    <Route path="partners/:userId" element={<PartnerProfilePage />} />
                    <Route path="money" element={<MoneyPage />} />
                    <Route path="this-harvest" element={<ThisHarvestPage />} />
                    <Route path="this-harvest/review" element={<ThisHarvestReviewPage />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    <Route
                      path="analytics"
                      element={<Navigate to="/reports" replace />}
                    />
                    <Route
                      path="reports"
                      element={
                        <FullOnlyRoute>
                          <ReportsPage />
                        </FullOnlyRoute>
                      }
                    />
                    <Route path="today" element={<TodayRedirect />} />
                    <Route path="notes" element={<Navigate to={CHRONOLOGIO_HOME} replace />} />
                    <Route path="ministry" element={<MinistryNotificationsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route
                      path="data-sources"
                      element={
                        <FullOnlyRoute>
                          <DataSourcesPage />
                        </FullOnlyRoute>
                      }
                    />
                  </Route>
                </Routes>
              </Router>
            </NotificationProvider>
            </OfflineProvider>
          </ExperienceModeProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

export default App;

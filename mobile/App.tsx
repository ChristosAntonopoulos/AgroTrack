import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';
import LoadingSpinner from './src/components/LoadingSpinner';
import ErrorBoundary from './src/components/ErrorBoundary';
import { cleanupStorage } from './src/utils/storageCleanup';
import { toBoolean } from './src/utils/booleanConverter';
import DashboardScreen from './src/screens/DashboardScreen';

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const safeIsLoading = toBoolean(isLoading, 'AppContent.isLoading');
  const safeIsAuthenticated = toBoolean(isAuthenticated, 'AppContent.isAuthenticated');

  if (safeIsLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!safeIsAuthenticated) {
    return (
      <>
        <LoginScreen onLoginSuccess={() => {}} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
};

export default function App() {
  // Run cleanup on app startup - but AuthContext will also run it,
  // so this is just a backup. The AuthContext cleanup happens first
  // and is more important since it runs before reading auth data.
  useEffect(() => {
    // Small delay to let AuthContext cleanup run first
    const timer = setTimeout(() => {
      cleanupStorage().catch((error) => {
        console.error('Error during app-level storage cleanup:', error);
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

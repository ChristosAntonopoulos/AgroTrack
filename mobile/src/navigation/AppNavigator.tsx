import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DashboardScreen from '../screens/DashboardScreen';
import FieldsListScreen from '../screens/FieldsListScreen';
import TaskListScreen from '../screens/TaskListScreen';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing } from '../theme';

// Import detail screens for navigation
import FieldDetailScreen from '../screens/FieldDetailScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';

// Custom Tab Navigator - avoids React Navigation Tab Navigator boolean serialization issues
const AppNavigator = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [overlayScreen, setOverlayScreen] = useState<string | null>(null);
  const [overlayParams, setOverlayParams] = useState<any>(null);

  const tabs = [
    { id: 'Dashboard', label: 'Dashboard', icon: '📊', component: DashboardScreen },
    { id: 'Fields', label: 'Fields', icon: '🏡', component: FieldsListScreen },
    { id: 'Tasks', label: 'Tasks', icon: '📋', component: TaskListScreen },
  ];

  const ActiveScreen = tabs.find(tab => tab.id === activeTab)?.component || DashboardScreen;

  const navigation = {
    navigate: (screen: string, params?: any) => {
      const tabIds = ['Fields', 'Tasks', 'Dashboard'];
      if (tabIds.includes(screen)) {
        setOverlayScreen(null);
        setOverlayParams(null);
        setActiveTab(screen);
      } else {
        setOverlayScreen(screen);
        setOverlayParams(params || {});
      }
    },
    goBack: () => {
      setOverlayScreen(null);
      setOverlayParams(null);
    },
  };

  const renderOverlayScreen = () => {
    if (!overlayScreen) return null;

    const screens: Record<string, React.ReactNode> = {
      FieldDetail: (
        <FieldDetailScreen
          route={{ params: { fieldId: overlayParams?.fieldId || '' } }}
          navigation={navigation}
        />
      ),
      TaskDetail: (
        <TaskDetailScreen
          route={{ params: { taskId: overlayParams?.taskId || '' } }}
          navigation={navigation}
        />
      ),
    };

    return screens[overlayScreen] || null;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerContainer}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerIcon}>🫒</Text>
            <Text style={styles.headerTitle}>Olive Lifecycle</Text>
          </View>
          {user?.role ? (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user.role}</Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
      <View style={styles.content}>
        {overlayScreen ? (
          <View style={styles.overlayContainer}>
            {renderOverlayScreen()}
          </View>
        ) : (
          <ActiveScreen navigation={navigation} />
        )}
      </View>
      <SafeAreaView edges={['bottom']} style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => {
                  setOverlayScreen(null);
                  setOverlayParams(null);
                  setActiveTab(tab.id);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                  {tab.icon}
                </Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    minHeight: 56,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTitle: {
    ...typography.styles.h3,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  roleBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  roleText: {
    ...typography.styles.caption,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  tabBarContainer: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    zIndex: 1000,
    elevation: 10,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    minHeight: 64,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 5,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  tabActive: {
    // Active tab styling
  },
  tabIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  tabIconActive: {
    // Active icon styling
  },
  tabLabel: {
    ...typography.styles.caption,
    color: colors.gray500,
    fontSize: 12,
    fontWeight: typography.fontWeight.regular,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
    fontSize: 12,
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default AppNavigator;

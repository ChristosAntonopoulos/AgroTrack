import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TodayScreen from '../screens/TodayScreen';
import FieldsListScreen from '../screens/FieldsListScreen';
import TaskListScreen from '../screens/TaskListScreen';
import MoreScreen from '../screens/MoreScreen';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import BrandLogo from '../components/ui/BrandLogo';
import { colors as themeColors, typography, spacing } from '../theme';

// Import detail screens for navigation
import FieldDetailScreen from '../screens/FieldDetailScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';

// Custom Tab Navigator - avoids React Navigation Tab Navigator boolean serialization issues
const AppNavigator = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier, isEveryday } = usePreferences();
  const [activeTab, setActiveTab] = useState('Today');
  const [overlayScreen, setOverlayScreen] = useState<string | null>(null);
  const [overlayParams, setOverlayParams] = useState<any>(null);

  const tabs = [
    { id: 'Today', label: 'Today', icon: 'sunny', component: TodayScreen },
    { id: 'Fields', label: 'Fields', icon: 'leaf', component: FieldsListScreen },
    { id: 'Tasks', label: 'Tasks', icon: 'list', component: TaskListScreen },
    { id: 'More', label: 'More', icon: 'ellipsis-horizontal', component: MoreScreen },
  ];

  const ActiveScreen = tabs.find(tab => tab.id === activeTab)?.component || DashboardScreen;

  const navigation = {
    navigate: (screen: string, params?: any) => {
      const tabIds = ['Today', 'Fields', 'Tasks', 'More'];
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={[styles.headerContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.header, { minHeight: Math.max(tapMin, 56) }]}>
          <View style={styles.headerLeft}>
            <BrandLogo size={30} style={styles.headerLogo} />
            <Text style={[styles.headerTitle, { color: colors.primary, fontSize: 20 * fontScaleMultiplier }]}>
              AgroTrack
            </Text>
          </View>
          {user?.role ? (
            <View style={[styles.roleBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
              <Text style={[styles.roleText, { color: colors.primary, fontSize: 10 * fontScaleMultiplier }]}>
                {user.role}
              </Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
      <View style={styles.content}>
        {overlayScreen ? (
          <View style={[styles.overlayContainer, { backgroundColor: colors.background }]}>
            {renderOverlayScreen()}
          </View>
        ) : (
          <ActiveScreen navigation={navigation} />
        )}
      </View>
      <SafeAreaView edges={['bottom']} style={[styles.tabBarContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={[styles.tabBar, { backgroundColor: colors.surface }]}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, { minHeight: Math.max(tapMin, 64) }]}
                onPress={() => {
                  setOverlayScreen(null);
                  setOverlayParams(null);
                  setActiveTab(tab.id);
                }}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: isActive }}
              >
                <View style={[styles.tabIconWrapper, isActive && { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.tabIcon, { color: isActive ? colors.primary : colors.textSecondary, fontSize: 24 * fontScaleMultiplier }]}>
                    {/* Using icon placeholder - in production would use proper icons */}
                    {tab.icon === 'sunny' && '☀️'}
                    {tab.icon === 'leaf' && '🌿'}
                    {tab.icon === 'list' && '📋'}
                    {tab.icon === 'ellipsis-horizontal' && '⋯'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? colors.primary : colors.textSecondary,
                      fontSize: Math.max(13, 13 * fontScaleMultiplier),
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
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
  },
  headerContainer: {
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerLogo: {
    marginRight: 2,
  },
  headerTitle: {
    ...typography.styles.h3,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.3,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleText: {
    ...typography.styles.caption,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  tabBarContainer: {
    borderTopWidth: 1,
    zIndex: 1000,
    elevation: 10,
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    shadowColor: '#000',
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
    gap: 2,
  },
  tabIconWrapper: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    marginBottom: 2,
  },
  tabIcon: {
    textAlign: 'center',
  },
  tabLabel: {
    ...typography.styles.caption,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  overlayContainer: {
    flex: 1,
  },
});

export default AppNavigator;

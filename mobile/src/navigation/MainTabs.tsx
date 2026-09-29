import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FieldsStack from './FieldsStack';
import TaskListScreen from '../screens/TaskListScreen';
import MoreScreen from '../screens/MoreScreen';
import ChronologioScreen from '../screens/ChronologioScreen';
import LauncherScreen from '../screens/LauncherScreen';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const CapturePlaceholder = () => <View />;

/**
 * Tab state only. The visible dock is AppDock, rendered above the root stack
 * so it stays reachable after leaving these tab roots.
 */
const MainTabs = () => {
  return (
    <Tab.Navigator
      key="main-tabs-v3"
      initialRouteName="Launcher"
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tab.Screen name="Launcher" component={LauncherScreen} />
      <Tab.Screen name="ChronologioTab" component={ChronologioScreen} />
      <Tab.Screen name="Fields" component={FieldsStack} />
      <Tab.Screen name="Capture" component={CapturePlaceholder} />
      <Tab.Screen name="Tasks" component={TaskListScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
};

export default MainTabs;

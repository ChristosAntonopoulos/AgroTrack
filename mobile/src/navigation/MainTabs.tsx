import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FieldsStack from './FieldsStack';
import TaskListScreen from '../screens/TaskListScreen';
import MoreScreen from '../screens/MoreScreen';
import ChronologioScreen from '../screens/ChronologioScreen';
import { MainTabParamList } from './types';
import { usePreferences } from '../context/PreferencesContext';
import { useFamilyMembershipModules } from '../hooks/useFamilyMembershipModules';

const Tab = createBottomTabNavigator<MainTabParamList>();

const CapturePlaceholder = () => <View />;

/**
 * Tab state only. The visible dock is AppDock, rendered above the root stack
 * so it stays reachable after leaving these tab roots.
 */
const MainTabs = () => {
  const { defaultView } = usePreferences();
  const familyModules = useFamilyMembershipModules();

  const showFields = familyModules === null || Boolean(familyModules.has('fields'));
  const startMap = {
    fields: showFields ? 'Fields' : 'ChronologioTab',
    chronologio: 'ChronologioTab',
  } as const;
  const initialRouteName = startMap[defaultView] ?? 'ChronologioTab';

  return (
    <Tab.Navigator
      key="main-tabs-v2"
      initialRouteName={initialRouteName}
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tab.Screen name="ChronologioTab" component={ChronologioScreen} />
      <Tab.Screen name="Fields" component={FieldsStack} />
      <Tab.Screen name="Capture" component={CapturePlaceholder} />
      <Tab.Screen name="Tasks" component={TaskListScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
};

export default MainTabs;

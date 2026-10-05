import React, { useEffect } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FieldsStack from './FieldsStack';
import TaskListScreen from '../screens/TaskListScreen';
import MoreScreen from '../screens/MoreScreen';
import LauncherScreen from '../screens/LauncherScreen';
import { MainTabParamList, RootStackParamList } from './types';

/** Old History tab links open the stack screen, which owns the back-and-title bar. */
const HistoryTabGate = () => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, 'ChronologioTab'>>();
  const fieldId = route.params?.fieldId;

  useEffect(() => {
    const parent = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
    parent?.navigate('Chronologio', fieldId ? { fieldId } : undefined);
    navigation.navigate('Launcher');
  }, [fieldId, navigation]);

  return <View />;
};

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
      backBehavior="history"
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tab.Screen name="Launcher" component={LauncherScreen} />
      <Tab.Screen name="ChronologioTab" component={HistoryTabGate} />
      <Tab.Screen name="Fields" component={FieldsStack} />
      <Tab.Screen name="Capture" component={CapturePlaceholder} />
      <Tab.Screen name="Tasks" component={TaskListScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
};

export default MainTabs;

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FieldsListScreen from '../screens/FieldsListScreen';
import HarvestCampaignScreen from '../screens/HarvestCampaignScreen';
import type { FieldsStackParamList } from './types';

const Stack = createNativeStackNavigator<FieldsStackParamList>();

/** Fields tab stack — harvest stays inside MainTabs so the dock never disappears. */
const FieldsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
    <Stack.Screen name="FieldsHome" component={FieldsListScreen} />
    <Stack.Screen name="HarvestCampaign" component={HarvestCampaignScreen} />
  </Stack.Navigator>
);

export default FieldsStack;

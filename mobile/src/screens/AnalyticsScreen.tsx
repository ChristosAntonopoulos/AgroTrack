import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

/** Analytics was removed; keep the screen so old links land on Reports. */
const AnalyticsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  useEffect(() => {
    navigation.replace('Reports');
  }, [navigation]);
  return null;
};

export default AnalyticsScreen;

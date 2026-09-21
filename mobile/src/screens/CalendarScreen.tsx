import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

/** Calendar was a second task agenda. Old links land on Tasks. */
const CalendarScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  useEffect(() => {
    navigation.replace('Main', { screen: 'Tasks', params: { view: 'upcoming' } });
  }, [navigation]);
  return null;
};

export default CalendarScreen;

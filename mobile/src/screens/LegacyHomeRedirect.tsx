import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import LoadingSpinner from '../components/LoadingSpinner';

/** Old home destinations (dashboard, notes list) land on Chronologio. */
const LegacyHomeRedirect = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  useEffect(() => {
    navigation.replace('Main', { screen: 'ChronologioTab' });
  }, [navigation]);
  return <LoadingSpinner fullScreen />;
};

export default LegacyHomeRedirect;

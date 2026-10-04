import { useEffect } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import LoadingSpinner from '../components/LoadingSpinner';

/** Stack Chronologio is a deep-link gate. The living journal lives on the tab. */
const ChronologioStackRedirect = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Chronologio'>>();
  const fieldId = route.params?.fieldId;

  useEffect(() => {
    if (fieldId) {
      navigation.replace('Main', { screen: 'ChronologioTab', params: { fieldId } });
      return;
    }
    navigation.replace('Main', { screen: 'ChronologioTab' });
  }, [fieldId, navigation]);

  return <LoadingSpinner fullScreen />;
};

export default ChronologioStackRedirect;

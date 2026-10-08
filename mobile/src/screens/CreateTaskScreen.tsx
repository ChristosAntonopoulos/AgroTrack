import { useEffect } from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

/** Legacy create route opens the schedule sheet on Tasks. */
const CreateTaskScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateTask'>>();

  useEffect(() => {
    navigation.replace('Main', {
      screen: 'Tasks',
      params: {
        view: 'today',
        fieldId: route.params?.fieldId,
        schedule: true,
        templateCode: route.params?.templateCode,
      },
    });
  }, [navigation, route.params?.fieldId, route.params?.templateCode]);

  return null;
};

export default CreateTaskScreen;

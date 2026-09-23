import { useEffect } from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

/** Older links land on the work screen, where completion is confirmed. */
const TaskCompletionScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { taskId } = useRoute<RouteProp<RootStackParamList, 'TaskCompletion'>>().params;

  useEffect(() => {
    navigation.replace('TaskDetail', { taskId });
  }, [navigation, taskId]);

  return null;
};

export default TaskCompletionScreen;

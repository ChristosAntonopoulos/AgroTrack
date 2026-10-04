import { useEffect } from 'react';
import { CommonActions, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import LoadingSpinner from '../components/LoadingSpinner';

/** Root harvest routes are deep-link gates. The room lives on the Fields tab. */
const HarvestCampaignRedirect = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'HarvestCampaign'>>();

  useEffect(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Main',
            params: {
              screen: 'Fields',
              params: { screen: 'HarvestCampaign', params: route.params },
            },
          },
        ],
      })
    );
  }, [navigation, route.params]);

  return <LoadingSpinner fullScreen />;
};

export default HarvestCampaignRedirect;

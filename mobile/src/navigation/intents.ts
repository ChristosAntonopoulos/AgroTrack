import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HarvestCampaignParams, RootStackParamList } from './types';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

/** Open History on the root stack so it gets the same back-and-title bar as Money. */
export const openChronologioHome = (navigation: RootNav): void => {
  navigation.navigate('Chronologio');
};

/** Open History locked to one field. */
export const openChronologioForField = (navigation: RootNav, fieldId: string): void => {
  navigation.navigate('Chronologio', { fieldId });
};

/** Open harvest inside the Fields tab so ScreenHeader + MainTabs stay. */
export const openHarvestCampaign = (navigation: RootNav, params?: HarvestCampaignParams): void => {
  navigation.navigate('Main', {
    screen: 'Fields',
    params: { screen: 'HarvestCampaign', params },
  });
};

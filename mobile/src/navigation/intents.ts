import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HarvestCampaignParams, RootStackParamList } from './types';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

/** Open the living journal tab — never the stack Chronologio redirect. */
export const openChronologioHome = (navigation: RootNav): void => {
  navigation.navigate('Main', { screen: 'ChronologioTab' });
};

/** Open Chronologio locked to one field (History shortcut from the field page). */
export const openChronologioForField = (navigation: RootNav, fieldId: string): void => {
  navigation.navigate('Main', { screen: 'ChronologioTab', params: { fieldId } });
};

/** Open harvest inside the Fields tab so ScreenHeader + MainTabs stay. */
export const openHarvestCampaign = (navigation: RootNav, params?: HarvestCampaignParams): void => {
  navigation.navigate('Main', {
    screen: 'Fields',
    params: { screen: 'HarvestCampaign', params },
  });
};

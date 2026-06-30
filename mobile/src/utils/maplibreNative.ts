import { NativeModules } from 'react-native';

/** True when MapLibre Native is linked (dev client or release APK — not Expo Go). */
export const isMapLibreNativeAvailable = (): boolean =>
  NativeModules.MLRNModule != null;
